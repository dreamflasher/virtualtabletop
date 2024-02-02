function emojiToFilename(emoji) {
  return [...emoji].map(char => char.codePointAt(0).toString(16).padStart(4, '0')).join('_').replace(/_fe0f/g, '');
}

function emojis2images(dom) {
  const regex = /\ud83c\udff4(\udb40[\udc61-\udc7a])+\udb40\udc7f|(\ud83c[\udde6-\uddff]){2}|([\#\*0-9]\ufe0f?\u20e3)|(\u00a9|\u00ae|[\u203c\u2049\u20e3\u2122\u2139\u2194-\u2199\u21a9\u21aa\u231a\u231b\u2328\u23cf\u23e9-\u23fa\u24c2\u25aa\u25ab\u25b6\u25c0\u25fb-\u25fe\u2600-\u2604\u260e\u2611\u2614\u2615\u2618\u261d\u2620\u2622\u2623\u2626\u262a\u262e\u262f\u2638-\u263a\u2640\u2642\u2648-\u2653\u265f\u2660\u2663\u2665\u2666\u2668\u267b\u267e\u267f\u2692-\u2697\u2699\u269b\u269c\u26a0\u26a1\u26a7\u26aa\u26ab\u26b0\u26b1\u26bd\u26be\u26c4\u26c5\u26c8\u26ce\u26cf\u26d1\u26d3\u26d4\u26e9\u26ea\u26f0-\u26f5\u26f7-\u26fa\u26fd\u2702\u2705\u2708-\u270d\u270f\u2712\u2714\u2716\u271d\u2721\u2728\u2733\u2734\u2744\u2747\u274c\u274e\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27a1\u27b0\u27bf\u2934\u2935\u2b05-\u2b07\u2b1b\u2b1c\u2b50\u2b55\u3030\u303d\u3297\u3299]|\ud83c[\udc04\udccf\udd70\udd71\udd7e\udd7f\udd8e\udd91-\udd9a\udde6-\uddff\ude01\ude02\ude1a\ude2f\ude32-\ude3a\ude50\ude51\udf00-\udf21\udf24-\udf93\udf96\udf97\udf99-\udf9b\udf9e-\udff0\udff3-\udff5\udff7-\udfff]|\ud83d[\udc00-\udcfd\udcff-\udd3d\udd49-\udd4e\udd50-\udd67\udd6f\udd70\udd73-\udd7a\udd87\udd8a-\udd8d\udd90\udd95\udd96\udda4\udda5\udda8\uddb1\uddb2\uddbc\uddc2-\uddc4\uddd1-\uddd3\udddc-\uddde\udde1\udde3\udde8\uddef\uddf3\uddfa-\ude4f\ude80-\udec5\udecb-\uded2\uded5-\uded7\udedc-\udee5\udee9\udeeb\udeec\udef0\udef3-\udefc\udfe0-\udfeb\udff0]|\ud83e[\udd0c-\udd3a\udd3c-\udd45\udd47-\ude7c\ude80-\ude88\ude90-\udebd\udebf-\udec5\udece-\udedb\udee0-\udee8\udef0-\udef8])((\ud83c[\udffb-\udfff])?(\ud83e[\uddb0-\uddb3])?(\ufe0f?\u200d([\u2000-\u3300]|[\ud83c-\ud83e][\ud000-\udfff])\ufe0f?)?)*/g;
  dom.innerHTML = dom.innerHTML.replace(regex, m=>`<img class="emoji" src="i/noto-emoji/emoji_u${emojiToFilename(m)}.svg" alt="${m}">`);
}

function images2emojis(dom) {
  const regexpUnicodeModified = /<img class="emoji" src="[^"]*i\/noto-emoji\/emoji_u[0-9a-f_]+\.svg" alt="([^"]+)"[^>]*>/g;
  dom.innerHTML = dom.innerHTML.replace(regexpUnicodeModified, (m,g)=>g);
}

let symbolData = null;
export async function loadSymbolPicker() {
  if(symbolData === null) {
    symbolData = 'loading';
    symbolData = await (await fetch('i/fonts/symbols.json')).json();
    let list = '';
    let gameIconsIndex = 0;
    for(const [ category, symbols ] of Object.entries(symbolData)) {
      list += `<h2 class="${category.match(/Material|VTT/)?'fontCategory':'imageCategory'}">${category}</h2>`;
      for(const [ symbol, keywords ] of Object.entries(symbols)) {
        if(symbol.includes('/')) {
          // increase resource limits in /etc/ImageMagick-6/policy.xml to 8GiB and then: montage -background none assets/game-icons.net/*/*.svg -geometry 48x48+0+0 -tile 60x assets/game-icons.net/overview.png
          list += `<i class="gameicons" title="game-icons.net: ${symbol}" data-type="game-icons" data-symbol="${symbol}" data-keywords="${symbol},${keywords.join().toLowerCase()}" style="--x:${gameIconsIndex%60};--y:${Math.floor(gameIconsIndex/60)};--url:url('i/game-icons.net/${symbol}.svg')"></i>`;
          ++gameIconsIndex;
        } else {
          let className = 'emoji';
          if(symbol[0] == '[')
            className = 'symbols';
          else if(symbol.match(/^[a-z0-9_]+$/))
            className = 'material-icons';
          if(category == 'Emoji - Flags')
            className += ' emojiFlag';
          list += `<i class="${className}" title="${className}: ${symbol}" data-type="${className}" data-symbol="${symbol}" data-keywords="${symbol},${keywords.join().toLowerCase()}" style="--url:url('i/noto-emoji/emoji_u${emojiToFilename(symbol)}.svg')">${symbol}</i>`;
        }
      }
    }
    $('#symbolList').innerHTML = list;

    $('#symbolPickerOverlay input').onkeyup = function() {
      const text = regexEscape($('#symbolPickerOverlay input').value.toLowerCase());
      for(const icon of $a('#symbolList i'))
        toggleClass(icon, 'hidden', !icon.dataset.keywords.match(text));
      for(const title of $a('#symbolList h2'))
        toggleClass(title, 'hidden', text);
      toggleClass($('#symbolPickerOverlay'), 'fewResults', $a('#symbolList i:not(.hidden)').length < 100);
    };
  }
}

export async function pickSymbol(type='all', bigPreviews=true, closeOverlay=true) {
  if($('#statesButton').dataset.overlay == 'symbolPickerOverlay')
    $('#statesButton').dataset.overlay = detailsOverlay;

  await loadSymbolPicker();
  return new Promise((resolve, reject) => {
    showOverlay('symbolPickerOverlay');
    $('#symbolPickerOverlay').classList.toggle('bigPreviews', bigPreviews);
    $('#symbolPickerOverlay').classList.toggle('hideFonts',   type=='images');
    $('#symbolPickerOverlay').classList.toggle('hideImages',  type=='fonts');
    $('#symbolPickerOverlay').scrollTop = 0;
    $('#symbolPickerOverlay input').value = '';
    $('#symbolPickerOverlay input').focus();
    $('#symbolPickerOverlay input').onkeyup();

    $('#symbolPickerOverlay [icon=close]').onclick = function(e) {
      if(closeOverlay)
        showOverlay(null);
      resolve(null);
    };

    for(const icon of $a('#symbolList i')) {
      icon.onclick = function(e) {
        if(closeOverlay)
          showOverlay(null);
        const isImage = ['emoji','game-icons'].indexOf(icon.dataset.type) != -1;
        let url = null;
        if(icon.dataset.type == 'emoji')
          url = `/i/noto-emoji/emoji_u${emojiToFilename(icon.dataset.symbol)}.svg`;
        if(icon.dataset.type == 'game-icons')
          url = `/i/game-icons.net/${icon.dataset.symbol}.svg`;
        resolve(Object.assign({...icon.dataset}, { isImage, url }));
      };
    }
  });
}

export function addRichtextControls(dom) {
  const controls = domByTemplate('template-richtext-controls');
  controls.classList.add('richtext-controls');
  dom.parentNode.insertBefore(controls, dom);
  for(const button of $a('[data-command]', controls)) {
    button.onclick = function() {
      document.execCommand(button.dataset.command, false, button.dataset.payload);
      dom.focus();
    };
  }

  loadSymbolPicker();

  $('[icon=format_size]', controls).onclick = function() {
    const parent = window.getSelection().getRangeAt(0).startContainer.parentNode.closest('h4');
    if(parent)
      parent.replaceWith(...parent.children);
    else
      document.execCommand('formatBlock', false, 'h4');
    dom.focus();
  };
  $('[icon=palette]', controls).onclick = function() {
    const range = window.getSelection().getRangeAt(0);
    document.execCommand('forecolor', false, '#000000');
    const input = document.createElement('input');
    input.type = 'color';
    input.onchange = function() {
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      document.execCommand('forecolor', false, input.value);
      dom.focus();
    };
    input.click();
  };

  $('[icon=art_track]', controls).onclick = $('[icon=add_photo_alternate]', controls).onclick = async function(e) {
    $('#statesButton').dataset.overlay = 'updateImageOverlay';
    const asset = await updateImage('', 'Cancel');
    showStatesOverlay(detailsOverlay);
    if(asset) {
      const floating = e.target == $('[icon=art_track]', controls) ? 'floating' : '';
      document.execCommand('inserthtml', false, `<a href="${mapAssetURLs(asset)}"><img class="${floating} richtextAsset" src="${mapAssetURLs(asset)}"></a>`);
    }
    dom.focus();
  };
  $('[icon=movie]', controls).onclick = async function() {
    $('#statesButton').dataset.overlay = 'confirmOverlay';
    if(await confirmOverlay('Upload video', 'Please note that VTT will not do video processing like YouTube to make sure your video plays everywhere.\n\nUse WebM or MPEG-4/H.264 format because those are well supported.', 'Upload', 'Cancel', 'upload', 'cancel')) {
      showStatesOverlay(detailsOverlay);
      const asset = await uploadAsset();
      if(asset)
        document.execCommand('inserthtml', false, `<video class="richtextAsset" src="${mapAssetURLs(asset)}" controls></video>`);
      dom.focus();
    } else {
      showStatesOverlay(detailsOverlay);
    }
  };
  $('[icon=add_reaction]', controls).onclick = async function() {
    const range = window.getSelection().getRangeAt(0);

    showStatesOverlay('symbolPickerOverlay');
    $('#symbolPickerOverlay').scrollTop = 0;
    for(const c of [ 'bigPreviews', 'hideFonts', 'hideImages' ])
      $('#symbolPickerOverlay').classList.remove(c);
    $('#symbolPickerOverlay input').value = '';
    $('#symbolPickerOverlay input').focus();
    $('#symbolPickerOverlay input').onkeyup();

    $('#symbolPickerOverlay [icon=close]').onclick = _=>showStatesOverlay(detailsOverlay);

    for(const icon of $a('#symbolList i')) {
      icon.onclick = function() {
        showStatesOverlay(detailsOverlay);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        if(icon.classList.contains('gameicons')) {
          document.execCommand('inserthtml', false, `<i class="richtextSymbol gameicons"><img src="i/game-icons.net/${icon.dataset.symbol}.svg"></i>`);
        } else {
          let className = 'emoji';
          if(icon.innerText[0] == '[')
            className = 'symbols';
          else if(icon.innerText.match(/^[a-z0-9_]+$/))
            className = 'material-icons';
          if(className == 'emoji')
            document.execCommand('inserthtml', false, icon.innerText);
          else
            document.execCommand('inserthtml', false, `<i class="richtextSymbol ${className}">${icon.innerText}</i>`);
        }
        for(const insertedSymbol of $a('.richtextSymbol'))
          insertedSymbol.contentEditable = false; // adding the property above causes Chrome to insert two icons
      };
    }
  };
}

export function removeRichtextControls(dom) {
  removeFromDOM(dom.previousSibling);
}
