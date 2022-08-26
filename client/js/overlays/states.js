let waitingForStateCreation = null;
let variantIDjustUpdated = null;

async function addState(e, type, src, id, addAsVariant) {
  const initialStatus = e && (e.target.dataset.initialText || e.target.innerText);
  if(e && !e.target.dataset.initialText)
    e.target.dataset.initialText = initialStatus;

  const status = function(t) {
    if(e)
      e.target.innerText=t;
  };

  if(type == 'link' && (!src || !src.match(/^http/)))
    return;
  if(!id)
    id = Math.random().toString(36).substring(3, 7);

  let blob = null;
  try {
    if(type == 'file') {
      status('Loading file...');
      const zip = await JSZip.loadAsync(src);
      const assets = {};
      for(const filename in zip.files)
        if(filename.match(/^\/?(user)?assets/) && zip.files[filename]._data && zip.files[filename]._data.crc32)
          assets[zip.files[filename]._data.crc32 + '_' + zip.files[filename]._data.uncompressedSize] = filename;

      status('Checking assets...');
      const result = await fetch('assetcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.keys(assets))
      });

      const exist = await result.json();

      let total = 0;
      let removed = 0;
      for(const asset in exist) {
        ++total;
        if(exist[asset]) {
          ++removed;
          zip.remove(assets[asset]);
        }
      }

      if(removed > total/2) {
        zip.file('asset-map.json', JSON.stringify(assets));
        status(`Rebuilding file (${removed}/${total} assets already exist)...`);
        blob = await zip.generateAsync({ type: 'blob', compression: total-removed < 5 ? 'DEFLATE' : 'STORE' });
      } else {
        blob = src;
      }
    } else {
      blob = new Blob([ src ], { type: 'text/plain' });
    }
  } catch(e) {
    alert(e);
    status(initialStatus);
    return;
  }

  let url = `addState/${roomID}/${id}/${type}/${src && src.name && encodeURIComponent(src.name)}/`;
  if(addAsVariant)
    url += addAsVariant;
  waitingForStateCreation = addAsVariant || id;

  var req = new XMLHttpRequest();
  req.onload = function(e) {
    if(e.target.status != 200)
      alert(`${e.target.status}: ${e.target.response}`);
    status(initialStatus);
  };
  req.upload.onprogress = e=>status(`Uploading (${Math.floor(e.loaded/e.total*100)}%)...`);

  req.open('PUT', url, true);
  req.setRequestHeader('Content-type', 'application/octet-stream');
  status('Starting upload...');
  req.send(blob);
}

function toggleStateStar(state, dom) {
  const targetList = dom.parentElement.parentElement == $('#statesList > div:nth-of-type(1)')
                   ? $('#statesList > div:nth-of-type(2) > .list')
                   : $('#statesList > div:nth-of-type(1) > .list');
  targetList.insertBefore(dom, [...targetList.children].filter(d=>$('h3', d).innerText.localeCompare($('h3', dom).innerText) > 0)[0]);
  $('#emptyLibrary').style.display = $('#statesList > div:nth-of-type(1) .roomState') ? 'none' : 'block';
  toServer('toggleStateStar', state.publicLibrary);
}

function updateLibraryFilter() {
  const text = $('#filterByText').value.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, m=>'\\'+m[0]);
  const type = $('#filterByType').value;
  const players = $('#filterByPlayers').value;
  const duration = $('#filterByDuration').value.split('-');
  const language = $('#filterByLanguage').value;
  const mode = $('#filterByMode').value;
  for(const state of $a('#statesList .list > div')) {
    const textMatch     = state.dataset.text.match(text);
    const typeMatch     = type     == 'Any' || state.dataset.type.split(',').indexOf(type) != -1;
    const playersMatch  = players  == 'Any' || state.dataset.players.split(',').indexOf(players) != -1;
    const durationMatch = duration == 'Any' || state.dataset.duration >= duration[0] && state.dataset.duration <= duration[1];
    const languageMatch = language == 'Any' || state.dataset.languages.split(',').indexOf(language) != -1;
    const modeMatch     = mode     == 'Any' || state.dataset.modes.split(',').indexOf(mode) != -1;
    if(textMatch && typeMatch && playersMatch && durationMatch && languageMatch && modeMatch)
      state.classList.add('visible');
    else
      state.classList.remove('visible');
  }
}

function parsePlayers(players) {
  const validPlayers = [];
  for(const token of players.split(',')) {
    const match = token.match(/^([0-9]+)(-([0-9]+)|\+)?$/);
    if(match)
      for(let i=+match[1]; i<=(match[2] ? +match[3]||20 : +match[1]); ++i)
        validPlayers.push(i);
  }
  return validPlayers;
}

function fillStatesList(states, starred, returnServer, activePlayers) {
  if(returnServer) {
    $('#statesButton').dataset.overlay = 'returnOverlay';
    overlayShownForEmptyRoom = true;
    return;
  }

  const emptyLibrary = $('#emptyLibrary');
  const addState = $('#addState');
  removeFromDOM('#statesList > div');

  let isEmpty = true;
  const sortedStates = Object.entries(states).sort((a, b) => a[1].name.localeCompare(b[1].name));

  const languageOptions = {};
  const modeOptions = {};

  const publicLibraryLinksFound = {};

  for(const publicLibrary of [ false, true ]) {
    const category = domByTemplate('template-stateslist-category');
    $('.title', category).textContent = publicLibrary ? 'Public Library' : 'Your Game Shelf';

    for(const kvp of sortedStates.filter(kvp=>(!!kvp[1].publicLibrary && (!starred || !starred[kvp[1].publicLibrary])) == publicLibrary)) {
      isEmpty = false;

      const state = kvp[1];
      state.id = kvp[0];
      state.starred = starred && starred[state.publicLibrary];

      const entry = domByTemplate('template-stateslist-entry');
      entry.dataset.id = state.id;
      entry.className = state.image ? 'roomState' : 'roomState noImage';
      if(state.publicLibrary)
        entry.className += ' publicLibraryGame';

      $('img', entry).src = state.image.replace(/^\//, '');
      $('h3', entry).textContent = state.name;
      $('h4', entry).textContent = state.similarName && state.name != state.similarName ? `Similar to ${state.similarName}` : '';

      const validPlayers = [];
      const validLanguages = [];
      let hasVariants = false;
      for(const variantID in state.variants) {
        let variant = state.variants[variantID];
        if(variant.plStateID) {
          publicLibraryLinksFound[`${variant.plStateID} - ${variant.plVariantID}`] = true;
          variant = states[variant.plStateID].variants[variant.plVariantID];
        }

        if(!publicLibraryLinksFound[`${state.id} - ${variantID}`])
          hasVariants = true;

        validPlayers.push(...parsePlayers(variant.players));
        validLanguages.push(variant.language);
        languageOptions[variant.language] = true;
      }

      modeOptions[state.mode] = true;

      if(hasVariants) {
        entry.addEventListener('click', _=>fillStateDetails(states, state, entry));
        $('.star', entry).addEventListener('click', function(e) {
          toggleStateStar(state, entry);
          event.stopPropagation();
        });
        $('.list', category).appendChild(entry);
      }

      entry.dataset.text = `${state.name} ${state.similarName} ${state.description}`.toLowerCase();
      entry.dataset.players = validPlayers.join();
      entry.dataset.duration = String(state.time).replace(/.*[^0-9]/, '');
      entry.dataset.languages = validLanguages.join();
      entry.dataset.modes = state.mode;

      if(state.publicLibrary && state.publicLibrary.match(/tutorials/))
        entry.dataset.type = 'Tutorials';
      else if(state.publicLibrary && state.publicLibrary.match(/assets/))
        entry.dataset.type = 'Assets';
      else
        entry.dataset.type = 'Games';

      if(state.id == waitingForStateCreation) {
        waitingForStateCreation = null;
        if($('#statesButton').dataset.overlay !== 'statesOverlay')
          showStatesOverlay('statesOverlay');
      }
    }

    $('#statesList').appendChild(category);
  }

  $('#statesList > div').insertBefore(emptyLibrary, $('#statesList > div > h2').nextSibling);
  $('#statesList > div').insertBefore(addState, $('#statesList > div > h2').nextSibling);
  emptyLibrary.style.display = $('#statesList > div:nth-of-type(1) .roomState') ? 'none' : 'block';

  const previousLanguage = $('#filterByLanguage').value;
  let languageHTML = '<option>Any</option>';
  for(const languageOption in languageOptions)
    languageHTML += `<option ${previousLanguage && previousLanguage == languageOption ? 'selected' : ''}>${languageOption}</option>`;
  $('#filterByLanguage').innerHTML = languageHTML;

  const previousMode = $('#filterByMode').value;
  let modeHTML = '<option>Any</option>';
  for(const modeOption in modeOptions)
    modeHTML += `<option ${previousMode && previousMode == modeOption ? 'selected' : ''}>${modeOption}</option>`;
  $('#filterByMode').innerHTML = modeHTML;

  updateLibraryFilter();

  if($('#stateDetailsOverlay').style.display != 'none') {
    const stateID = $('#stateDetailsOverlay').dataset.id;
    if(!states[stateID]) {
      showStatesOverlay('statesOverlay');
    } else if(!$('#stateDetailsOverlay').classList.contains('editing')) {
      showOverlay();
      fillStateDetails(states, states[stateID], $(`#statesOverlay .roomState[data-id="${stateID}"]`));
    }
  }
}

function fillStateDetails(states, state, dom) {
  showStatesOverlay('stateDetailsOverlay');
  $('#stateDetailsOverlay').dataset.id = state.id;
  for(const dom of $a('#stateDetailsOverlay, #stateDetailsOverlay > *'))
    dom.scrollTop = 0;

  disableEditing($('#stateDetailsOverlay'), state);
  applyValuesToDOM($('#stateDetailsOverlay'), state);

  toggleClass($('#stateDetailsOverlay .star'), 'active', !!state.starred);
  toggleClass($('#stateDetailsOverlay .star'), 'hidden', !state.publicLibrary);

  function fillArrowButton(arrowDom, targetDom) {
    arrowDom.style.display = targetDom ? 'block' : 'none';
    if(targetDom) {
      arrowDom.dataset.id = targetDom.dataset.id;
      $('img', arrowDom).src = $('img', targetDom).src;
      toggleClass($('img', arrowDom), 'hidden', $('img', arrowDom).src == location.href);
      $('h3', arrowDom).innerText = $('h3', targetDom).innerText;
      $('h4', arrowDom).innerText = $('h4', targetDom).innerText;
    }
    arrowDom.onclick = function() {
      showOverlay();
      targetDom.click();
    };
  }
  const visibleStates = [...$a('.roomState.visible', dom.parentElement)];
  fillArrowButton($('#nextState'), visibleStates[visibleStates.indexOf(dom)+1])
  fillArrowButton($('#prevState'), visibleStates[visibleStates.indexOf(dom)-1])

  const deletable = !state.publicLibrary || config.allowPublicLibraryEdits;
  const editable  = !state.link && deletable;
  toggleClass($('#stateDetailsOverlay .buttons [icon=edit]'), 'hidden', !editable);
  toggleClass($('#stateDetailsOverlay .buttons [icon=delete]'), 'hidden', !deletable);
  toggleClass($('#stateDetailsOverlay .buttons [icon=edit_off]'), 'hidden', editable || deletable);

  function updateStateDetailsDomains(state) {
    $('#similarDetailsDomain').innerText = String(state.bgg).replace(/^ *https?:\/\/(www\.)?/, '').replace(/\/.*/, '');
    $('#similarRulesDomain').innerText = String(state.rules).replace(/^ *https?:\/\/(www\.)?/, '').replace(/\/.*/, '');
  }
  updateStateDetailsDomains(state);

  const variantOperationQueue = [];

  const createTempState = async function(e, operation, variantID, buttons) {
    const previousText = e.target.innerText;
    e.target.innerText = 'Copying active game...';
    for(const button of buttons)
      button.disabled = true;
    variantOperationQueue.push({
      operation,
      variantID,
      filenameSuffix: await (await fetch(`createTempState/${roomID}`)).text()
    });
    for(const button of buttons)
      button.disabled = false;
    e.target.innerText = previousText;
  }

  const addVariant = function(variantID, variant) {
    const stateIDforLoading = variant.plStateID || state.id;
    const variantIDforLoading = variant.plVariantID || variantID;
    const isLinkedVariant = !!variant.plStateID;
    if(variant.plStateID)
      variant = states[variant.plStateID].variants[variant.plVariantID];

    if(!variant.variantImage)
      variant.variantImage = state.image;

    const vEntry = domByTemplate('template-variantslist-entry', variant);
    vEntry.className = isLinkedVariant ? 'linked variant' : 'variant';

    if(isLinkedVariant)
      for(const dom of $a('[data-field]', vEntry))
        dom.classList.add('uneditable');

    toggleClass($('img', vEntry), 'hidden', !variant.variantImage);
    $('img', vEntry).src = String(variant.variantImage).replace(/^\//, '');

    $('[icon=play_arrow]', vEntry).onclick = function() {
      toServer('loadState', { stateID: stateIDforLoading, variantID: variantIDforLoading });
      $('#activeGameButton').click();
    };

    $('[icon=edit]',  vEntry).onclick = function(e) {
      for(const variantDOM of $a('#stateDetailsOverlay .variantsList .variant'))
        toggleClass(variantDOM, 'editingVariant', e.target == $('[icon=edit]', variantDOM) && !variantDOM.classList.contains('editingVariant'));
    };

    $('[icon=save]', vEntry).onclick = function(e) {
      createTempState(e, 'save', [...$a('#stateDetailsOverlay .variant')].indexOf(vEntry), $a('button', vEntry));
    };
    $('[icon=north]', vEntry).onclick = function() {
      variantOperationQueue.push({
        operation: 'up',
        variantID: [...$a('#stateDetailsOverlay .variant')].indexOf(vEntry)
      });
      vEntry.parentNode.insertBefore(vEntry, vEntry.previousSibling);
    };
    $('[icon=south]', vEntry).onclick = function() {
      variantOperationQueue.push({
        operation: 'down',
        variantID: [...$a('#stateDetailsOverlay .variant')].indexOf(vEntry)
      });
      if(vEntry.nextSibling)
        vEntry.nextSibling.after(vEntry);
      else
        vEntry.parentNode.prepend(vEntry);
    };
    $('[icon=delete]', vEntry).onclick = function() {
      variantOperationQueue.push({
        operation: 'delete',
        variantID: [...$a('#stateDetailsOverlay .variant')].indexOf(vEntry)
      });
      removeFromDOM(vEntry);
    };

    $('#stateDetailsOverlay .variantsList').appendChild(vEntry);
    return vEntry;
  }

  $('#stateDetailsOverlay .variantsList').innerHTML = '';
  for(const variantID in state.variants)
    addVariant(variantID, state.variants[variantID]);



  $('#variantsList > [icon=add]').onclick = function() {
    showStatesOverlay('variantAddOverlay');
    $('#variantAddOverlay select').innerHTML = '';
    for(const [ id, state ] of Object.entries(states)) {
      if(state.publicLibrary) {
        for(const [ variantID, variant ] of Object.entries(state.variants)) {
          const option = document.createElement('option');
          option.value = `${id}/${variantID}`;
          option.innerText = `${state.name} - ${variant.players} - ${variant.language} - ${variant.variant}`;
          $('#variantAddOverlay select').appendChild(option);
        }
      }
    }
  };
  $('#variantAddOverlay [icon=save]').onclick = async function(e) {
    const variantID = $a('#stateDetailsOverlay .variant').length;
    await createTempState(e, 'create', variantID, $a('#variantAddOverlay button'));
    showStatesOverlay('stateDetailsOverlay');
    const emptyVariant = { variantImage: state.image };
    const vEntry = addVariant(variantID, emptyVariant);
    enableEditing(vEntry, emptyVariant);
  };
  $('#variantAddOverlay [icon=upload]').onclick = function(e) {
    selectFile(false, async function(f) {
      // TODO
    });
  };
  $('#variantAddOverlay [icon=link]').onclick = function(e) {
    showStatesOverlay('stateDetailsOverlay');
    const tokens = $('#variantAddOverlay select').value.split('/');
    const newVariant = { plStateID: tokens[0], plVariantID: tokens[1] };
    const vEntry = addVariant($a('#stateDetailsOverlay .variant').length, newVariant);
    enableEditing(vEntry, newVariant);
    variantOperationQueue.push({
      operation: 'newLink',
      variant: newVariant
    });
  };

  $('#closeDetails').onclick = function() {
    showStatesOverlay('statesOverlay');
  };
  $('#stateDetailsOverlay .buttons [icon=download]').onclick = function() {
    window.open(`dl/${roomID}/${state.id}`);
  };
  $('#stateDetailsOverlay .buttons [icon=delete]').onclick = async function() {
    $('#statesButton').dataset.overlay = 'confirmOverlay';
    if(await confirmOverlay('Delete game', 'Are you sure you want to completely remove this game from your game shelf?', 'Delete', 'Keep')) {
      toServer('removeState', state.id);
      removeFromDOM(dom);
      $('#emptyLibrary').style.display = $('#statesList > div:nth-of-type(1) .roomState') ? 'none' : 'block';
      showStatesOverlay('statesOverlay');
    } else {
      showStatesOverlay('stateDetailsOverlay');
    }
  };

  $('#stateDetailsOverlay .star').onclick = function(e) {
    e.currentTarget.classList.toggle('active');
    $(`#statesOverlay .roomState[data-id="${state.id}"] .star`).click();
  };

  $('#stateDetailsOverlay .buttons [icon=edit]').onclick = function() {
    enableEditing($('#stateDetailsOverlay'), state);

    for(const uploadButton of $a('#stateDetailsOverlay button[icon=image]')) {
      uploadButton.onclick = async function() {
        const isVariantImage = uploadButton.parentNode.classList.contains('variantEdit');
        const img = $('img', uploadButton.parentNode.parentNode);
        $('#statesButton').dataset.overlay = 'updateImageOverlay';
        let newURL = await updateImage(uploadButton.value, isVariantImage ? 'Use state image' : null);
        if(!newURL && isVariantImage)
          newURL = state.image;
        uploadButton.value = newURL;
        toggleClass(img, 'hidden', !newURL);
        img.src = newURL ? newURL.replace(/^\//, '') : '';
        showStatesOverlay('stateDetailsOverlay');
      };
    }
  };
  $('#discardDetails').onclick = function() {
    showStatesOverlay('statesOverlay');
    dom.click();
  };
  $('.buttons [icon=save]').onclick = function() {
    const meta = Object.assign(JSON.parse(JSON.stringify(state)), getValuesFromDOM($('#stateDetailsOverlay')));

    const variantInput = [];
    for(const variantDOM of $a('#variantsList .variant')) {
      const input = getValuesFromDOM(variantDOM);
      if(input.variantImage == meta.image)
        input.variantImage = '';
      variantInput.push(input);
      disableEditing(variantDOM, input);
    }

    disableEditing($('#stateDetailsOverlay'), meta);
    updateStateDetailsDomains(meta);

    toServer('editState', {
      id: meta.id,
      meta,
      variantInput,
      variantOperationQueue
    });
  };
}

async function updateImage(currentImage, noImageText) {
  return new Promise(function(resolve, reject) {
    showOverlay('updateImageOverlay');
    const o = $('#updateImageOverlay');

    $('img.previous', o).src = currentImage.replace(/^\//, '');
    $('img.current', o).src = currentImage.replace(/^\//, '');
    $('input.current', o).value = currentImage;

    $('button[icon=image_not_supported]', o).innerText = noImageText || 'Use no image';

    $('button[icon=upload]', o).onclick = async function() {
      $('input', o).value = await uploadAsset();
      $('img.current', o).src = $('input', o).value.replace(/^\//, '');
    };
    $('input ', o).oninput = async function() {
      $('img.current', o).src = $('input', o).value.replace(/^\//, '');
    };

    $('button[icon=undo]', o).onclick = function() {
      showOverlay();
      resolve(currentImage);
    };
    $('button[icon=image_not_supported]', o).onclick = function() {
      showOverlay();
      resolve('');
    };
    $('button[icon=check]', o).onclick = function() {
      showOverlay();
      resolve($('input.current', o).value);
    };
  });
}

async function confirmOverlay(title, text, confirmButton, cancelButton) {
  return new Promise(function(resolve, reject) {
    showOverlay('confirmOverlay');
    applyValuesToDOM($('#confirmOverlay'), { title, text, confirmButton, cancelButton });

    $('#confirmOverlay button:nth-of-type(1)').onclick = function() {
      showOverlay();
      resolve(false);
    };
    $('#confirmOverlay button:nth-of-type(2)').onclick = function() {
      showOverlay();
      resolve(true);
    };
  });
}

async function shareLink() {
  showOverlay('shareLinkOverlay');
  let url = $('#stateLink').value;
  if(!url) {
    const name = $('#stateName').value.replace(/[^A-Za-z0-9.-]/g, '_');
    url = await fetch(`share/${roomID}/${$('#stateEditOverlay').dataset.id}`);
    url = `${location.origin}${await url.text()}/${name}.vtt`;
  }
  $('#sharedLink').value = url;
}

onLoad(function() {
  onMessage('meta', args=>fillStatesList(args.meta.states, args.meta.starred, args.meta.returnServer, args.activePlayers));

  on('#filterByText', 'keyup', updateLibraryFilter);
  on('#clearSearch', 'click', _=>{$('#filterByText').value='';updateLibraryFilter();$('#filterByText').focus()});
  on('#stateFilters select', 'change', updateLibraryFilter);

  on('#addState', 'click', _=>showStatesOverlay('stateAddOverlay'));

  on('#stateAddOverlay .create, #addVariant .create', 'click', e=>addState(e, 'state'));
  on('#stateAddOverlay .upload, #addVariant .upload', 'click', e=>selectFile(false, f=>addState(e, 'file', f)));
  on('#stateAddOverlay .link,   #addVariant .link',   'click', e=>addState(e, 'link', prompt('Enter shared URL:')));

  on('#addState .download', 'click', _=>downloadState(null));

  on('#shareOK', 'click', _=>showOverlay('stateEditOverlay'));
});
