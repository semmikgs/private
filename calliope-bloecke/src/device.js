/* Export: .hex-Datei und direkte Übertragung per USB (WebUSB) */
(function () {
  const BOARD_ID_V3 = 0x9903;
  const USB_FILTERS = [
    { vendorId: 0x1366, productId: 0x1025 },
    { vendorId: 0x0d28, productId: 0x0204 }
  ];
  const quietLog = { log() {}, event() {}, error() {} };

  function init(app) {
    const { workspace, openModal, para } = app;
    const flashBtn = document.getElementById('flashBtn');
    let firmwarePromise = null;
    let busy = false;

    /* ---------- Firmware entpacken (einmalig) ---------- */
    function firmwareHex() {
      if (!firmwarePromise) {
        firmwarePromise = (async () => {
          const bin = Uint8Array.from(atob(window.CAL_FIRMWARE_GZ_B64), c => c.charCodeAt(0));
          const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
          return await new Response(stream).text();
        })();
        firmwarePromise.catch(() => { firmwarePromise = null; });
      }
      return firmwarePromise;
    }

    /* ---------- Programm übersetzen und in die Firmware einbetten ---------- */
    function translate() {
      const result = CalExport.generate(workspace);
      if (result.scriptCount === 0) {
        openModal({
          title: 'Noch kein Programm',
          body: [para('Auf den Calliope kommen nur Skripte, die mit einem Ereignis-Block beginnen, zum Beispiel „Wenn Calliope startet“.')],
          cancel: false
        });
        return null;
      }
      return result;
    }

    async function buildFs(code) {
      const hex = await firmwareHex();
      const fs = new CalFlashLib.MicropythonFsHex([{ hex, boardId: BOARD_ID_V3 }]);
      try {
        fs.write('main.py', code);
      } catch (e) {
        const err = new Error('too-big');
        err.cause = e;
        throw err;
      }
      return fs;
    }

    function tooBigDialog() {
      openModal({
        title: 'Programm zu groß',
        body: [para('Das Programm passt nicht in den Speicher des Calliope. Entferne Blöcke, die nicht gebraucht werden, und versuche es erneut.')],
        cancel: false
      });
    }

    /* ---------- .hex herunterladen ---------- */
    async function downloadHex({ quiet = false } = {}) {
      const result = translate();
      if (!result) return;
      let fs;
      try {
        fs = await buildFs(result.code);
      } catch (e) {
        if (e.message === 'too-big') { tooBigDialog(); return; }
        throw e;
      }
      const hexText = fs.getIntelHex(BOARD_ID_V3);
      const fileName = app.fileNameFor('.hex');
      const url = URL.createObjectURL(new Blob([hexText], { type: 'application/octet-stream' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      if (quiet) return;
      const steps = document.createElement('ol');
      [
        'Calliope mini 3 per USB-Kabel mit dem Computer verbinden.',
        `Die Datei „${fileName}“ aus dem Download-Ordner auf das Laufwerk MINI ziehen.`,
        'Warten, bis das Kopieren fertig ist. Der Calliope startet das Programm dann von selbst.'
      ].forEach(text => { const li = document.createElement('li'); li.textContent = text; steps.appendChild(li); });
      openModal({ title: '.hex-Datei gespeichert', body: [steps], cancel: false });
    }

    /* ---------- Direkt per USB übertragen ---------- */
    async function pickDevice() {
      const known = await navigator.usb.getDevices();
      const match = known.filter(d => USB_FILTERS.some(f => f.vendorId === d.vendorId && f.productId === d.productId));
      if (match.length === 1) return match[0];
      return navigator.usb.requestDevice({ filters: USB_FILTERS });
    }

    function progressDialog() {
      const text = para('Verbindung wird aufgebaut …');
      text.className = 'progressText';
      const bar = document.createElement('div');
      bar.className = 'progress';
      const fill = document.createElement('div');
      fill.className = 'progressBar';
      bar.appendChild(fill);
      const hint = para('Kabel nicht abziehen, bis die Übertragung fertig ist.');
      const ctrl = openModal({ title: 'Auf Calliope übertragen', body: [text, bar, hint], buttons: false, locked: true });
      return {
        set(label, fraction) {
          text.textContent = label;
          if (fraction !== undefined) fill.style.width = `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
        },
        close: ctrl.close
      };
    }

    function errorDialog(title, message) {
      openModal({
        title,
        body: [para(message), para('Alternativ kannst du die .hex-Datei herunterladen und auf das Laufwerk MINI ziehen.')],
        okText: '.hex herunterladen',
        cancelText: 'Schließen',
        onOk: () => downloadHex()
      });
    }

    async function flash() {
      if (busy) return;
      if (!navigator.usb) {
        openModal({
          title: 'Direktes Übertragen nicht möglich',
          body: [para('Dieser Browser kann nicht direkt auf den Calliope zugreifen. Das funktioniert in Google Chrome und Microsoft Edge am Computer.'),
            para('Du kannst stattdessen die .hex-Datei herunterladen und auf das Laufwerk MINI ziehen.')],
          okText: '.hex herunterladen',
          onOk: () => downloadHex()
        });
        return;
      }
      const result = translate();
      if (!result) return;

      /* Gerät zuerst wählen: der Browser verlangt dafür den direkten Klick */
      let device;
      try {
        device = await pickDevice();
      } catch (e) {
        if (e && e.name === 'NotFoundError') return; // Auswahl abgebrochen
        errorDialog('Kein Zugriff auf USB', 'Der Browser hat den Zugriff auf USB verweigert.');
        return;
      }

      busy = true;
      flashBtn.disabled = true;
      const dlg = progressDialog();
      let conn = null;
      try {
        const fs = await buildFs(result.code);
        const dataSource = {
          partialFlashData: async () => fs.getIntelHexBytes(BOARD_ID_V3),
          fullFlashData: async () => new TextEncoder().encode(fs.getIntelHex(BOARD_ID_V3))
        };
        conn = new CalFlashLib.DAPWrapper(device, quietLog);
        await CalFlashLib.withTimeout(conn.reconnectAsync(), 10000);

        let boardId;
        try { boardId = conn.boardSerialInfo.id; } catch (e) { throw Object.assign(new Error('unknown-board'), { cause: e }); }
        if (!boardId.isV2()) throw new Error('not-v3');

        const flashing = new CalFlashLib.PartialFlashing(conn, quietLog);
        dlg.set('Programm wird übertragen …', 0);
        await flashing.flashAsync(boardId, dataSource, (fraction, partial) => {
          if (fraction === undefined) return;
          dlg.set(partial ? 'Programm wird übertragen …' : 'Programm und MicroPython werden übertragen … (beim ersten Mal etwas länger)', fraction);
        });
        dlg.close();
        openModal({
          title: 'Übertragen',
          body: [para('Das Programm ist auf dem Calliope und startet jetzt.')],
          cancel: false
        });
      } catch (e) {
        console.error('Übertragung fehlgeschlagen:', e);
        dlg.close();
        try { if (conn) await conn.disconnectAsync(); } catch (_) { /* ignorieren */ }
        const msg = String((e && e.message) || e);
        if (msg === 'too-big') tooBigDialog();
        else if (msg === 'not-v3') errorDialog('Falsches Gerät', 'Das verbundene Gerät ist kein Calliope mini 3. Der Export funktioniert nur mit der mini 3.');
        else if (msg === 'unknown-board') errorDialog('Gerät nicht erkannt', 'Das verbundene Gerät wurde nicht als Calliope mini 3 erkannt.');
        else if (/claim|in use|access denied|Unable to open|SecurityError/i.test(msg)) {
          errorDialog('Calliope ist belegt', 'Der Calliope wird gerade von einem anderen Programm oder Browser-Tab benutzt, zum Beispiel MakeCode. Schließe es, stecke das Kabel neu ein und versuche es erneut.');
        } else if (e instanceof CalFlashLib.TimeoutError || /timeout/i.test(msg)) {
          errorDialog('Keine Antwort vom Calliope', 'Der Calliope reagiert nicht. Stecke das USB-Kabel neu ein und versuche es erneut.');
        } else {
          errorDialog('Übertragung fehlgeschlagen', 'Beim Übertragen ist ein Fehler aufgetreten. Stecke das USB-Kabel neu ein und versuche es erneut.');
        }
      } finally {
        busy = false;
        flashBtn.disabled = false;
      }
    }

    flashBtn.addEventListener('click', flash);
    app.downloadHex = () => downloadHex().catch(err => {
      console.error(err);
      openModal({ title: 'Export fehlgeschlagen', body: [para('Die .hex-Datei konnte nicht erzeugt werden.')], cancel: false });
    });
    app.exportPython = () => CalExport.generate(workspace).code;
    app.buildHexText = async () => (await buildFs(CalExport.generate(workspace).code)).getIntelHex(BOARD_ID_V3);
  }

  window.CalDevice = { init };
})();
