/*
 * Updated attachments script for contract editor
 * Auto loads attachments from IndexedDB on page load and filters to specific file names
 * Adds deletion function to remove attachments from list
 */
(function() {
  const filesList = document.getElementById('files-list');
  // Provide DB functions if not defined
  let db;
  async function dbOpen() {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open('arkonCRM_local', 2);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('files')) {
          d.createObjectStore('files', { keyPath: 'id' });
        }
      };
      r.onsuccess = () => {
        db = r.result;
        resolve();
      };
      r.onerror = () => reject(r.error);
    });
  }
  async function dbListFiles() {
    await dbOpen();
    return new Promise((resolve, reject) => {
      const out = [];
      const tx = db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cur = e.target.result;
        if (cur) {
          out.push(cur.value);
          cur.continue();
        } else {
          resolve(out);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }
  function renderAttachment({ name, type, href }) {
    const div = document.createElement('div');
    div.className = 'row';
    div.style.alignItems = 'center';
    // Preview element
    const preview = document.createElement('div');
    preview.style.marginRight = '8px';
    if (type === 'pdf') {
      const embed = document.createElement('embed');
      embed.src = href;
      embed.type = 'application/pdf';
      embed.style.width = '80px';
      embed.style.height = '90px';
      preview.appendChild(embed);
    } else if (type === 'img') {
      const img = document.createElement('img');
      img.src = href;
      img.style.width = '80px';
      img.style.height = '90px';
      img.style.objectFit = 'cover';
      preview.appendChild(img);
    } else {
      preview.textContent = '[DOCX]';
      preview.style.fontSize = '14px';
    }
    const info = document.createElement('div');
    info.innerHTML = `<strong>${name}</strong><br>`;
    if (type === 'pdf' || type === 'docx') {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = 'Pobierz';
      link.setAttribute('download', name);
      link.target = '_blank';
      info.appendChild(link);
    }
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Usuń';
    removeBtn.className = 'btn bad';
    removeBtn.style.marginLeft = 'auto';
    removeBtn.onclick = () => {
      let list = JSON.parse(localStorage.getItem('arkon_contract_files') || '[]');
      list = list.filter((item) => item.name !== name);
      localStorage.setItem('arkon_contract_files', JSON.stringify(list));
      div.remove();
    };
    div.appendChild(preview);
    div.appendChild(info);
    div.appendChild(removeBtn);
    filesList.appendChild(div);
  }
  function refreshFiles() {
    filesList.innerHTML = '';
    const list = JSON.parse(localStorage.getItem('arkon_contract_files') || '[]');
    list.forEach((file) => {
      renderAttachment(file);
    });
  }
  // Automatically load attachments on page load and filter to specific names
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const uploaded = await dbListFiles();
      const list = JSON.parse(localStorage.getItem('arkon_contract_files') || '[]');
      const allowedNames = [
        'ANKIETA Audyt Energetyczny .docx',
        'OSÌ WIADCZENIE BENEFICJENTA O PRZEPROWADZENIU WIZJI LOKALNEJ NIERUCHOMOSÌ CI W CELU WYKONANIA AUDYTU ENERGETYCZNEGO BUDYNKU.pdf',
        'umowa arkon ocieplenie 2025 (3) (1) (1) (1) (1) (1) (1) (1) (1).pdf',
        'Zdjęcie WhatsApp 2025-07-20 o 19.05.43_2df47b5f.jpg22.jpg'
      ];
      uploaded.forEach((f) => {
        const name = f.name || f.filename || 'plik';
        if (!allowedNames.includes(name)) return;
        const mime = (f.type || '').toLowerCase();
        let type = mime.includes('pdf')
          ? 'pdf'
          : mime.includes('image')
          ? 'img'
          : /\.pdf$/i.test(name)
          ? 'pdf'
          : /\.(jpe?g|png|gif|webp)$/i.test(name)
          ? 'img'
          : 'docx';
        const href = f.blob ? URL.createObjectURL(f.blob) : '#';
        if (!list.some((x) => x.name === name)) {
          list.push({ name, href, type });
        }
      });
      localStorage.setItem('arkon_contract_files', JSON.stringify(list));
      refreshFiles();
    } catch (ex) {
      refreshFiles();
    }
  });
})();