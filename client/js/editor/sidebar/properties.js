/* helper functions generated by ChatGPT */

function positionElementsInArc(elements, radius, arcAngle, container) {
  const n = elements.length;
  const middleIndex = Math.floor(n / 2);

  for (let i = 0; i < n; i++) {
    const angle = (arcAngle / (n - 1)) * (i - middleIndex);
    const radians = (Math.PI / 180) * angle;
    const x = container.clientWidth / 2 + radius * Math.sin(radians) - elements[i].offsetWidth / 2;
    const y = container.clientHeight / 2 + (radius - elements[i].offsetHeight / 2) * (1 - Math.cos(radians));

    elements[i].style.position = 'absolute';
    elements[i].style.left = `${x}px`;
    elements[i].style.top = `${y-100}px`;
    elements[i].style.transform = `rotate(${angle}deg)`;
    elements[i].style.zIndex = (i === middleIndex ? n : n - Math.abs(i - middleIndex));
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getBoundingClientRectWithAbsoluteChildren(element) {
  const rect = element.children.length ? { left: 9999, top: 9999, right: 0, bottom: 0 } : element.getBoundingClientRect();
  let left = rect.left;
  let top = rect.top;
  let right = rect.right;
  let bottom = rect.bottom;

  for(const child of element.children) {
    const childRect = child.getBoundingClientRect();
    left = Math.min(left, childRect.left);
    top = Math.min(top, childRect.top);
    right = Math.max(right, childRect.right);
    bottom = Math.max(bottom, childRect.bottom);
  }

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top
  };
}

function centerElementInClientRect(element, boundingClientRect) {
  const elementRect = getBoundingClientRectWithAbsoluteChildren(element);

  const centerX = boundingClientRect.left + boundingClientRect.width / 2;
  const centerY = boundingClientRect.top + boundingClientRect.height / 2;

  const elementCenterX = elementRect.left + elementRect.width / 2;
  const elementCenterY = elementRect.top + elementRect.height / 2;

  const translateX = centerX - elementCenterX;
  const translateY = centerY - elementCenterY;

  element.style.transform = `translate(${translateX}px, ${translateY}px) ${element.style.transform}`;
}

function parseRankRange(rankRange) {
  const rankArray = [];
  const rankElements = rankRange.split(',');

  rankElements.forEach(rankElement => {
    if(rankElement.match(/-?[0-9]+--?[0-9]+/)) {
      const [start, end] = rankElement.split('-').map(Number);
      for(let i = start; i <= end; i++)
        rankArray.push(i);
    } else {
      rankArray.push(rankElement);
    }
  });

  return rankArray;
}

/* end helper functions */


class PropertiesModule extends SidebarModule {
  constructor() {
    super('tune', 'Properties', 'Edit widget properties.');
  }

  addInput(type, labelText, value, target) {
    const div = document.createElement('div');
    const idPost = Math.random().toString(36).substring(3, 12);

    const label = document.createElement('label');
    label.htmlFor = "propertyModule"+idPost;
    label.textContent = labelText;
    label.style.display = 'inline-block';
    label.style.width = '100px';
    div.appendChild(label);

    (target || this.moduleDOM).append(div);

    if(typeof value != 'object') {
      const input = document.createElement('input');
      input.id = "propertyModule"+idPost;
      input.value = String(value);
      div.appendChild(input);
      return input;
    }
  }

  addPropertyListener(widget, property, updater) {
    updater(widget);

    if(!this.inputUpdaters[widget.id])
      this.inputUpdaters[widget.id] = {};
    if(!this.inputUpdaters[widget.id][property])
      this.inputUpdaters[widget.id][property] = [];

    this.inputUpdaters[widget.id][property].push(v=>updater(widget));
  }

  inputValueUpdated(widget, property, value) {
    if(value.match(/^(-?[0-9]+(\.[0-9]+)?|null|true|false)$/))
      widget.set(property, JSON.parse(value));
    else
      widget.set(property, value);
  }

  onDeltaReceivedWhileActive(delta) {
    for(const widgetID in delta.s)
      if(delta.s[widgetID] && this.inputUpdaters[widgetID])
        for(const property in delta.s[widgetID])
          if(this.inputUpdaters[widgetID][property])
            for(const updater of this.inputUpdaters[widgetID][property])
              updater(delta.s[widgetID][property]);
  }

  onSelectionChangedWhileActive(newSelection) {
    this.moduleDOM.innerHTML = '';
    this.inputUpdaters = {};

    for(const widget of newSelection) {
      this.addHeader(widget.id);
      this.inputUpdaters[widget.id] = {};

      if(widget.get('type') == 'card')
        this.renderCardLayers(widget);
      if(widget.get('type') == 'holder')
        this.renderForHolder(widget);

      for(const property in widget.state) {
        if([ 'id', 'type', 'parent' ].indexOf(property) != -1)
          continue;

        const input = this.addInput('text', property, widget.state[property])
        if(input) {
          if(!this.inputUpdaters[widget.id][property])
            this.inputUpdaters[widget.id][property] = [];

          input.onkeyup = e=>this.inputValueUpdated(widget, property, input.value);
          this.inputUpdaters[widget.id][property].push(v=>input.value=String(v));
        }
      }
    }

    if(!newSelection.length)
      this.addDeck();
  }

  addDeck() {
    this.addHeader('Add deck');

    function createRadioButtons(target, name, options, callback) {
      let html = '';
      Object.keys(options).forEach((key, index) => {
        const option = options[key];
        html += `
          <div>
            <input type="radio" id="${name}${index}" name="${name}" value="${key}">
            <label for="${name}${index}"><strong>${option.header}</strong><div>${option.description}</div></label>
          </div>
        `;
      });

      const radioButtonsHTML = `<div class=headerRadioButtons>${html}</div>`;
      const container = document.createElement('div');
      container.innerHTML = radioButtonsHTML;
      target.append(container);

      Object.keys(options).forEach((_, index) => {
        const radioButton = container.querySelector(`#${name}${index}`);
        radioButton.addEventListener('change', (event) => {
          callback(event.target.value);
        });
      });

      return container;
    }

    createRadioButtons(this.moduleDOM, 'deckType', {
      custom: {
        header: 'Custom deck of cards',
        description: 'Generate a deck by defining suits (symbols and colors) and ranks for each suit'
      },
      images: {
        header: 'Upload one image per card',
        description: 'Generate a deck by uploading an image per card that covers the whole card'
      }
    }, v=>{
      options.innerHTML = '';
      if(v == 'custom')
        this.deckGenerator(options);
      if(v == 'images')
      this.deckImages(options);
    });

    const options = div(this.moduleDOM);
  }

  deckGenerator(target) {
    const deckTemplates = [ this.deckTemplate_standard, this.deckTemplate_colors, this.deckTemplate_simple, this.deckTemplate_skinny, this.deckTemplate_transparent ];

    const defaultRanks = [ 'skoll/diamonds', 'skoll/hearts', 'skoll/clubs', 'skoll/spades' ];

    const suitDivs = {};
    const colors = {};
    const ranks = {};

    this.addSubHeader('Suit symbols', target);

    const suitCustomizeDiv = document.createElement('div');
    this.addSubHeader('Suit properties', suitCustomizeDiv);

    const linkedRanksToggleDiv = document.createElement('div');
    const linkedRanksLabel = document.createElement('label');
    linkedRanksLabel.textContent = 'Same ranks for each suit:';
    const linkedRanksToggle = document.createElement('input');
    linkedRanksToggle.type = 'checkbox';
    linkedRanksToggle.checked = true;
    linkedRanksLabel.htmlFor = linkedRanksToggle.id = 'sameRanksToggle';

    linkedRanksToggleDiv.appendChild(linkedRanksLabel);
    linkedRanksToggleDiv.appendChild(linkedRanksToggle);
    suitCustomizeDiv.append(linkedRanksToggleDiv);

    const updateLinkedRanks = (symbol, newRanks) => {
      for(const otherSymbol in ranks)
        if(linkedRanksToggle.checked && otherSymbol !== symbol)
          $('.ranks input', suitDivs[otherSymbol]).value = ranks[otherSymbol] = newRanks;
    };
    const designSelectionDiv = document.createElement('div');
    const updateDesignPreview = _=>{
      const oldScrollTop = this.moduleDOM.scrollTop;
      for(const button of $a('.deckTemplateButton', target))
        button.remove();

      if(Object.keys(colors).length == 0) {
        createButton.disabled = true;
        return;
      }

      const deck = getDeckDefinition();
      for(const [ index, deckTemplate ] of Object.entries(deckTemplates)) {
        const templateButton = this.renderWidgetButton(new Deck(deck.id), deckTemplate(deck), designSelectionDiv);
        templateButton.classList.add('deckTemplateButton');
        templateButton.dataset.index = index;
        templateButton.onclick = e=>{
          for(const button of $a('.deckTemplateButton', target))
            if(button != templateButton)
              button.classList.remove('selected');
          templateButton.classList.toggle('selected');
          createButton.disabled = false;
        };
        deck.id = generateUniqueWidgetID();
      }
      this.moduleDOM.scrollTop = oldScrollTop;
    };

    for(const symbol of [ 'skoll/diamonds', 'skoll/hearts', 'skoll/clubs', 'skoll/spades', 'delapouite/round-star', 'delapouite/flower-emblem', 'delapouite/plain-circle', 'lorc/biohazard', 'lorc/fluffy-trefoil' ]) {
      const symbolButton = this.renderWidgetButton(new BasicWidget(), {
        image: `/i/game-icons.net/${symbol}.svg`,
        color: '#000',
        svgReplaces: { '#000': 'color' }
      }, target);
      symbolButton.dataset.symbol = symbol;
      symbolButton.classList.add('deckGeneratorSymbol');
      symbolButton.onclick = async e=>{
        symbolButton.classList.toggle('selected');
        if(symbolButton.classList.contains('selected')) {
          colors[symbol] = [ 'skoll/diamonds', 'skoll/hearts' ].includes(symbol) ? '#e50932' : '#000000';
          ranks[symbol] = '2-10,J,Q,K,A';

          suitDivs[symbol] = document.createElement('div');
          suitDivs[symbol].classList.add('suitProperties');
          const suitWidget = new BasicWidget();
          this.renderWidgetButton(suitWidget, {
            image: `/i/game-icons.net/${symbol}.svg`,
            color: colors[symbol],
            svgReplaces: { '#000': 'color' }
          }, suitDivs[symbol]);

          const colorPickerDiv = document.createElement('div');
          const colorPickerLabel = document.createElement('label');
          colorPickerLabel.textContent = 'Color:';
          const colorPicker = document.createElement('input');
          colorPicker.type = 'color';
          colorPicker.value = colors[symbol];
          colorPicker.onchange = e=>{
            colors[symbol] = colorPicker.value;
            suitWidget.applyDelta({ color: colorPicker.value });
            updateDesignPreview();
          };
          colorPickerDiv.appendChild(colorPickerLabel);
          colorPickerDiv.appendChild(colorPicker);
          suitDivs[symbol].append(colorPickerDiv);

          const rankInputDiv = document.createElement('div');
          const rankInputLabel = document.createElement('label');
          rankInputDiv.classList.add('ranks');
          rankInputLabel.textContent = 'Ranks:';
          const rankInput = document.createElement('input');
          rankInput.value = ranks[symbol];

          rankInput.onkeyup = e => {
            updateLinkedRanks(symbol, ranks[symbol] = rankInput.value);
            updateDesignPreview();
          };

          rankInputDiv.appendChild(rankInputLabel);
          rankInputDiv.appendChild(rankInput);
          suitDivs[symbol].append(rankInputDiv);

          suitCustomizeDiv.append(suitDivs[symbol]);
        } else {
          suitDivs[symbol].remove();
          delete suitDivs[symbol];
          delete colors[symbol];
          delete ranks[symbol];
        }
        updateDesignPreview();
      };

      if(defaultRanks.includes(symbol))
        symbolButton.click();
    }
    target.append(suitCustomizeDiv);

    function getDeckDefinition() {
      const id = generateUniqueWidgetID();
      const cardTypes = {};
      let suitIndex = 0;

      for(const [ suitSymbol, suitColor ] of Object.entries(colors)) {
        const suitURL = `/i/game-icons.net/${suitSymbol}.svg`;
        for(const rank of parseRankRange(ranks[suitSymbol])) {
          const cT = `${rank} of ${suitSymbol.replace(/.*\//, '')}`;
          cardTypes[cT] = {
            suit: suitURL,
            suitColor,
            rank
          };
          const setCardTypes = (conditions, cardTypesKeys) => {
            if(conditions)
              for(const key of cardTypesKeys)
                cardTypes[cT][`suit-${key}`] = suitURL;
          };
          if(String(rank).match(/^[0-9]+$/) && rank <= 21) {
            setCardTypes(rank     >=  4,                           ['P11', 'P13', 'P51', 'P53']);
            setCardTypes(rank     >= 12 || rank == 2 || rank == 3, ['P12', 'P52']);
            setCardTypes(rank     ==  7 || rank == 8,              ['P22']);
            setCardTypes(rank     >= 16 || rank >= 6 && rank <= 8, ['P31', 'P33']);
            setCardTypes(rank % 2 ==  1 && rank != 7,              ['P32']);
            setCardTypes(rank     ==  8,                           ['P42']);

            setCardTypes(rank >= 9,                                                          ['S21', 'S23', 'S31', 'S33']);
            setCardTypes(rank >= 20 || rank == 10 || rank == 11 || rank >= 14 && rank <= 17, ['S12', 'S42']);
            setCardTypes(rank >= 12,                                                         ['S22', 'S32']);
            setCardTypes(rank >= 18,                                                         ['S11', 'S13', 'S41', 'S43']);
          }
          if('JQK'.includes(rank)) {
            let defaultRanksuit = defaultRanks[suitIndex % 4].substr(6, 1).toUpperCase();
            if(defaultRanks.includes(suitSymbol))
              defaultRanksuit = suitSymbol.substr(6, 1).toUpperCase();
            cardTypes[cT].rankImage = `/i/cards-default/${rank}${defaultRanksuit}-face.svg`;
          } else if(!String(rank).match(/^[0-9]+$/) || rank > 21) {
            cardTypes[cT].rankImage = `/i/game-icons.net/${suitSymbol}.svg`;
          }
        }
        suitIndex += 1;
      }

      return {
        type: 'deck',
        id,
        cardTypes
      };
    }

    const createButton = document.createElement('button');
    createButton.innerText = 'Add to game';
    createButton.className = 'green';
    createButton.disabled = true;
    createButton.setAttribute('icon', 'add');
    createButton.onclick = async e=>{
      batchStart();
      const deck = getDeckDefinition();
      setDeltaCause(`${getPlayerDetails().playerName} added custom deck "${deck.id}" in editor`);
      await addWidgetLocal(deckTemplates[$('.selected.deckTemplateButton', target).dataset.index](deck));

      let suitIndex = 0;
      for(const [ suitSymbol, suitColor ] of Object.entries(colors)) {
        let x = 0;
        for(const rank of parseRankRange(ranks[suitSymbol])) {
          const cT = `${rank} of ${suitSymbol.replace(/.*\//, '')}`;
          await addWidgetLocal({
            type: 'card',
            id: `${deck.id} ${cT}`,
            deck: deck.id,
            cardType: cT,
            x,
            y: suitIndex * 160,
            activeFace: 1
          });
          x += 103;
        }
        suitIndex += 1;
      }

      batchEnd();
    };

    target.append(suitCustomizeDiv);

    this.addSubHeader('Card design', target);
    target.append(designSelectionDiv);
    updateDesignPreview();
    target.append(createButton);
  }

  deckImages(target) {
    this.addSubHeader('Card backs', target);
    let backImageURL = '/i/cards-default/2B.svg';
    const backButtons = div(target);

    const addBackImageButton = image=>{
      this.renderWidgetButton(new BasicWidget(), { image }, backButtons).onclick = e=>{
        for(const button of $a('.widgetSelectionButton', backButtons))
          if(button != e.currentTarget)
            button.classList.remove('selected');
        e.currentTarget.classList.add('selected');
        backImageURL = image;
      };
      if(backImageURL == image)
        $('.widgetSelectionButton:last-child', backButtons).click();
    };
    for(const image of [ '/i/cards-default/1B.svg', '/i/cards-default/2B.svg', '/i/cards-default/3B.svg', '/i/cards-plastic/1B.svg', '/i/cards-plastic/2B.svg' ])
      addBackImageButton(image);

    div(target, 'buttonBar', `
      <button icon=upload id=backButton>Upload back...</button>
    `);

    $('#backButton').onclick = _=>uploadAsset(function(imagePath, fileName) {
      addBackImageButton(imagePath);
      $('.widgetSelectionButton:last-child', backButtons).click();
    });

    this.addSubHeader('Card fronts', target);
    const preview = div(target);

    div(target, 'goButton buttonBar', `
      <button icon=upload id=frontsButton>Upload fronts...</button>
      <button icon=add class=green disabled>Add to game</button>
    `);

    $('#frontsButton').onclick = _=>uploadAsset(async function(imagePath, fileName) {
      const dom = div(preview, 'cardFrontPreview', `
        <img src="${imagePath}">
        <div class=flexCenter>
          <div>
            <input type=range value=1 max=10> <input type=number value=1 min=0>
            <button icon=delete>Delete</button>
          </div>
        </div>
      `);
      dom.dataset.imagePath = imagePath;
      dom.dataset.fileName = fileName;
      $('[type=range]', dom).oninput = e=>$('[type=number]', dom).value=e.target.value;
      $('[type=number]', dom).oninput = e=>$('[type=range]', dom).value=e.target.value;
      $('[icon=delete]', dom).onclick = e=>dom.remove();
      $('.goButton [icon=add]', target).disabled = false;
    });

    $('.goButton [icon=add]', target).onclick = async _=>{
      const id = generateUniqueWidgetID();
      const cardTypes = {};
      const counts = {};
      for(const previewDiv of $a('.cardFrontPreview', preview)) {
        cardTypes[previewDiv.dataset.fileName] = {
          image: previewDiv.dataset.imagePath
        };
        counts[previewDiv.dataset.fileName] = $('input', previewDiv).value;
      }

      const deck = {
        id,
        type: 'deck',
        cardTypes,
        faceTemplates: [
          {
            "objects": [
              {
                "type": "image",
                "color": "transparent",
                "width": 103,
                "height": 160,
                "value": backImageURL
              }
            ]
          },
          {
            "objects": [
              {
                "type": "image",
                "color": "transparent",
                "width": 103,
                "height": 160,
                "dynamicProperties": {
                  "value": "image"
                }
              }
            ]
          }
        ]
      };

      const cardWidth = Math.round($('.cardFrontPreview img', preview).width / $('.cardFrontPreview img', preview).height * 160);
      if(cardWidth != 103) {
        deck.cardDefaults = { width: cardWidth };
        deck.faceTemplates[0].objects[0].width = cardWidth;
        deck.faceTemplates[1].objects[0].width = cardWidth;
      }
      await this.addDeckWithCards(deck, 'image', counts);
    };
  }

  async addDeckWithCards(deck, type, counts) {
    batchStart();
    setDeltaCause(`${getPlayerDetails().playerName} added ${type} deck "${deck.id}" in editor`);
    await addWidgetLocal(deck);

    const cardWidth = deck.cardDefaults && deck.cardDefaults.width || 103;
    let x = 0;
    let y = 0;
    for(const cardType in deck.cardTypes) {
      const count = counts ? counts[cardType] || 0 : 1;
      for(let i=1; i<=count; ++i) {
        await addWidgetLocal({
          type: 'card',
          id: `${deck.id} ${cardType}${count > 1 ? ' '+i : ''}`,
          deck: deck.id,
          cardType: cardType,
          x,
          y: y * 160,
          activeFace: 1
        });
        x += cardWidth;
        if(x+cardWidth > 1600) {
          y += 1;
          x = 0;
        }
      }
    }

    batchEnd();
  }

  deckTemplate_colors(deck) {
    deck.cardDefaults = {
      outline: '<path stroke="#1f1f1f" stroke-width="8" '
    };
    deck.faceTemplates = [
      {
        "radius": 10,
        "objects": [
          {
            "type": "image",
            "width": 103,
            "height": 160,
            "color": "#fff"
          },
          {
            "type": "image",
            "x": 5,
            "y": 5,
            "width": 93,
            "height": 150,
            "css": "border-radius:10px; background: linear-gradient(90deg, rgba(213,94,0,1) 14.3%, rgba(230,159,0,1) 14.4%, rgba(230,159,0,1) 28.6%, rgba(240,228,66,1) 28.7%, rgba(240,228,66,1) 42.8%, rgba(0,158,155,1) 42.9%, rgba(0,141,164,1) 57.1%, rgba(0,114,178,1) 57.2%, rgba(0,114,178,1) 71.4%, rgba(86,180,233,1) 71.5%, rgba(86,180,233,1) 85.7%, rgba(204,121,167,1) 85.8%, rgba(204,121,167,1) 100%);"
          }
        ],
        "border": 1
      },
      {
        "radius": 10,
        "objects": [
          {
            "type": "image",
            "width": 103,
            "height": 160,
            "color": "#fff"
          },
          {
            "type": "image",
            "x": 5,
            "y": 5,
            "width": 93,
            "height": 150,
            "dynamicProperties": {
              "color": "suitColor"
            },
            "css": "border-radius:7px"
          },
          {
            "type": "image",
            "x": 21.5,
            "y": 50,
            "width": 60,
            "height": 60,
            "color": "#fff",
            "css": "border-radius:100%; border:1px solid #444; background-size: 80%",
            "dynamicProperties": {
              "value": "suit"
            },
            "svgReplaces": {
              "#000": "suitColor",
              "<path ": "outline"
            }
          },
          {
            "type": "text",
            "x": 10,
            "y": 10,
            "textAlign": "center",
            "width": 30,
            "height": 30,
            "fontSize": 25,
            "color": "black",
            "dynamicProperties": {
              "value": "rank"
            },
            "css": "font-weight: bold !important; display: flex;justify-content: center; align-items: center;text-align: center;  border:1px solid black; border-radius:5px; background-color: #fff; letter-spacing: -1px"
          },
          {
            "type": "text",
            "x": 63,
            "y": 120,
            "textAlign": "center",
            "width": 30,
            "height": 30,
            "fontSize": 25,
            "color": "black",
            "dynamicProperties": {
              "value": "rank"
            },
            "css": "font-weight: bold !important; display: flex;justify-content: center; align-items: center;text-align: center;  border:1px solid black; border-radius:5px; background-color: #fff; letter-spacing: -1px",
            "rotation": 0
          }
        ],
        "border": 1
      }
    ];
    return deck;
  }

  deckTemplate_simple(deck) {
    deck.cardDefaults = {
      white: "#fff4\" stroke=\"#fff4\" stroke-width=\"20"
    };
    deck.faceTemplates = [
      {
        "objects": [
          {
            "type": "image",
            "width": 103,
            "height": 160,
            "color": "transparent",
            "value": "/i/cards-default/2B.svg"
          }
        ]
      },
      {
        "radius": 16,
        "objects": [
          {
            "type": "image",
            "width": 103,
            "height": 160,
            "dynamicProperties": {
              "color": "suitColor"
            }
          },
          {
            "type": "image",
            "x": 10,
            "y": 70,
            "width": 83,
            "height": 83,
            "color": "transparent",
            "svgReplaces": {
              "#000": "white"
            },
            "dynamicProperties": {
              "value": "suit"
            }
          },
          {
            "type": "text",
            "y": 0,
            "fontSize": 60,
            "textAlign": "center",
            "color": "white",
            "width": 103,
            "dynamicProperties": {
              "value": "rank"
            }
          }
        ]
      }
    ];
    return deck;
  }

  deckTemplate_skinny(deck) {
    deck.cardDefaults = {
      width: 80,
      height: 160
    };
    deck.faceTemplates = [
      {
        "objects": [
          {
            "type": "image",
            "width": 80,
            "height": 160,
            "color": "transparent",
            "value": "/i/cards-skinny/1B.svg"
          }
        ]
      },
      {
        "objects": [
          {
            "type": "image",
            "width": 80,
            "height": 160,
            "color": "white"
          },
          {
            "type": "image",
            "x": 10,
            "y": 80,
            "width": 60,
            "height": 60,
            "color": "transparent",
            "svgReplaces": {
              "#000": "suitColor"
            },
            "dynamicProperties": {
              "value": "suit"
            }
          },
          {
            "type": "text",
            "y": 10,
            "fontSize": 60,
            "textAlign": "center",
            "width": 80,
            "dynamicProperties": {
              "color": "suitColor",
              "value": "rank"
            }
          }
        ]
      }
    ];
    return deck;
  }

  deckTemplate_transparent(deck) {
    deck.cardDefaults = {
      width: 80,
      height: 80
    };
    deck.faceTemplates = [
      {
        "objects": [
          {
            "type": "image",
            "width": 80,
            "height": 80,
            "color": "white",
            "value": "/i/cards-default/2B.svg"
          }
        ]
      },
      {
        "radius": 16,
        "objects": [
          {
            "type": "image",
            "width": 80,
            "height": 80,
            "color": "transparent",
            "svgReplaces": {
              "#000": "suitColor"
            },
            "dynamicProperties": {
              "value": "suit"
            }
          },
          {
            "type": "text",
            "y": 18,
            "fontSize": 40,
            "textAlign": "center",
            "color": "white",
            "width": 80,
            "dynamicProperties": {
              "value": "rank"
            }
          }
        ]
      }
    ];
    return deck;
  }

  deckTemplate_standard(deck) {
    deck.faceTemplates = [
      {
        "objects": [
          {
            "type": "image",
            "width": 103,
            "height": 160,
            "color": "transparent",
            "value": "/i/cards-default/2B.svg"
          }
        ]
      },
      {
        "border": 1,
        "radius": 6,
        "objects": [
          {
            "type": "image",
            "width": 103,
            "height": 160,
            "color": "white"
          },
          {
            "type": "image",
            "x": 25,
            "y": 25,
            "width": 53,
            "height": 110,
            "color": "white",
            "dynamicProperties": {
              "value": "rankImage"
            },
            "svgReplaces": {
              "#000": "suitColor"
            },
            "css": {
              "background-size": "100% 100%"
            }
          },
          {
            "type": "text",
            "x": -3,
            "y": -2,
            "fontSize": 30,
            "textAlign": "center",
            "width": 25,
            "dynamicProperties": {
              "value": "rank",
              "color": "suitColor"
            },
            "css": {
              "letter-spacing": "-6px"
            }
          },
          {
            "type": "text",
            "x": 81,
            "y": 127,
            "fontSize": 30,
            "textAlign": "center",
            "width": 25,
            "dynamicProperties": {
              "value": "rank",
              "color": "suitColor"
            },
            "rotation": 180,
            "css": {
              "letter-spacing": "-6px"
            }
          },
          {
            "type": "image",
            "x": 1,
            "y": 28,
            "width": 23,
            "height": 23,
            "color": "transparent",
            "svgReplaces": {
              "#000": "suitColor"
            },
            "dynamicProperties": {
              "value": "suit"
            }
          },
          {
            "type": "image",
            "x": 79,
            "y": 110,
            "width": 23,
            "height": 23,
            "color": "transparent",
            "svgReplaces": {
              "#000": "suitColor"
            },
            "dynamicProperties": {
              "value": "suit"
            },
            "rotation": 180
          }
        ]
      }
    ];

    const commonProperties = {
      type: 'image',
      width: 16,
      height: 16,
      color: 'transparent',
      svgReplaces: {
        '#000': 'suitColor'
      }
    }
    for(let row = 0; row < 5; row++) {
      for(let col = 0; col < 3; col++) {
        const x = 25 + col * 18.5;
        const y = 25 + row * 23.5;
        deck.faceTemplates[1].objects.push(Object.assign({}, commonProperties, {
          x, y,
          dynamicProperties: {
            value: `suit-P${row + 1}${col + 1}`
          }
        }));
      }
    }

    for(let row = 0; row < 4; row++) {
      for(let col = 0; col < 3; col++) {
        const x = 25 + col * 18.5;
        const y = 40.6 + (row > 1 ? row + 1 : row) * 15.6;
        deck.faceTemplates[1].objects.push(Object.assign({}, commonProperties, {
          x, y,
          dynamicProperties: {
            value: `suit-S${row + 1}${col + 1}`
          }
        }));
      }
    }
    return deck;
  }

  faceObjectInputValueUpdated(deck, face, object, property, value, card, removeObjects) {
    if(value.match(/^(-?[0-9]+(\.[0-9]+)?|null|true|false)$/))
      this.faceTemplates[face].objects[object][property] = JSON.parse(value);
    else
      this.faceTemplates[face].objects[object][property] = value;

    //card.applyDeltaToDOM({ deck: card.get('deck') });
    for(let objectCard=object; objectCard<this.cardLayerCards[face].length; ++objectCard) {
      const oCard = this.cardLayerCards[face][objectCard];
      oCard.domElement.innerHTML = '';
      oCard.createFaces(this.faceTemplates);
      for(let i=0; i<oCard.domElement.children.length; ++i)
        oCard.domElement.children[i].classList.toggle('active', i == oCard.get('activeFace'));
      removeObjects(oCard, objectCard);
    }
  }

  applyFaceTemplateChanges(deck) {
    deck.set('faceTemplates', this.faceTemplates);
  }

  renderCardLayers(widget) {
    const deck = widgets.get(widget.get('deck'));
    const faceTemplates = this.faceTemplates = JSON.parse(JSON.stringify(deck.get('faceTemplates')));

    this.cardLayerCards = [];

    for(const face in faceTemplates) {
      this.cardLayerCards[face] = [];

      if(face == 0)
        this.addHeader('Back face');
      else if(face == 1)
        this.addHeader('Front face');
      else
        this.addHeader(`Face ${face}`);

      for(const object in faceTemplates[face].objects) {
        const objectDiv = document.createElement('div');
        objectDiv.className = 'faceTemplateEdit';

        const card = this.cardLayerCards[face][object] = new Card();
        const newState = {...widget.state};
        newState.activeFace = face;
        this.renderWidget(card, newState, objectDiv);
        const removeObjects = function(card, object) {
          for(const objectDOM of $a(`.active.cardFace .cardFaceObject:nth-child(n+${+object+2})`, card.domElement))
            objectDOM.remove();
        };
        removeObjects(card, object);
        const propsDiv = document.createElement('div');
        propsDiv.className = 'faceTemplateProperty';
        for(const prop in faceTemplates[face].objects[object]) {
          const input = this.addInput('text', prop, faceTemplates[face].objects[object][prop], propsDiv);
          if(input)
            input.onkeyup = e=>this.faceObjectInputValueUpdated(deck, face, object, prop, input.value, card, removeObjects);
        }
        objectDiv.appendChild(propsDiv);
        this.moduleDOM.appendChild(objectDiv);
      }
    }

    const applyButton = document.createElement('button');
    applyButton.innerText = 'Apply changes';
    applyButton.onclick = e=>this.applyFaceTemplateChanges(deck);
    this.moduleDOM.appendChild(applyButton);
  }

  renderForHolder(widget) {
    this.addSubHeader('Target widgets');
    for(const deck of widgetFilter(w=>w.get('type') == 'deck')) {
      if(!Object.keys(deck.get('cardTypes')).length)
        continue;
      const deckButton = this.renderWidgetButton(deck, {}, this.moduleDOM);
      this.addPropertyListener(widget, 'dropTarget', widget=>{
        if(asArray(widget.get('dropTarget')).filter(t=>t.deck == deck.id).length)
          deckButton.classList.add('selected');
        else
          deckButton.classList.remove('selected');
      });
      deckButton.onclick = async e=>{
        let newDropTarget = asArray(widget.get('dropTarget'));
        if(deckButton.classList.contains('selected'))
          newDropTarget = newDropTarget.filter(t=>t.deck != deck.id);
        else
          newDropTarget = newDropTarget.filter(t=>t.type!='card').concat({ deck: deck.id });

        if(newDropTarget.length == 1)
          newDropTarget = newDropTarget[0];
        else if(!newDropTarget.length)
          newDropTarget = null;

        widget.set('dropTarget', newDropTarget);
      };
    }


    this.addSubHeader('Appearance');
    const normal = this.renderWidgetButton(new Holder(), {
      type: 'holder',
      width: 50,
      height: 70
    }, this.moduleDOM);
    const semi = this.renderWidgetButton(new Holder(), {
      type: 'holder',
      width: 50,
      height: 70,
      css: { background: '#fff6' }
    }, this.moduleDOM);
    const transparent = this.renderWidgetButton(new Holder(), {
      type: 'holder',
      width: 50,
      height: 70,
      classes: 'transparent'
    }, this.moduleDOM);

    this.addPropertyListener(widget, 'css', widget=>{
      if(!widget.get('css') && !widget.get('classes'))
        normal.classList.add('selected');
      else
        normal.classList.remove('selected');
    });
    this.addPropertyListener(widget, 'classes', widget=>{
      if(!widget.get('css') && !widget.get('classes'))
        normal.classList.add('selected');
      else
        normal.classList.remove('selected');
    });
    normal.onclick = async e=>{
      if(!normal.classList.contains('selected')) {
        widget.set('classes', null);
        widget.set('css', null);
      }
    };

    this.addPropertyListener(widget, 'css', widget=>{
      if(String(widget.get('css')).includes('#fff6'))
        semi.classList.add('selected');
      else
        semi.classList.remove('selected');
    });
    semi.onclick = e=>{
      if(!semi.classList.contains('selected')) {
        widget.set('classes', null);
        widget.set('css', 'background:#fff6');
      }
    };

    this.addPropertyListener(widget, 'classes', widget=>{
      if(String(widget.get('classes')).includes('transparent'))
        transparent.classList.add('selected');
      else
        transparent.classList.remove('selected');
    });
    transparent.onclick = e=>{
      if(!transparent.classList.contains('selected')) {
        widget.set('classes', 'transparent');
        widget.set('css', null);
      }
    };
  }

  renderWidget(widget, state, target) {
    delete state.id;
    delete state.x;
    delete state.y;
    delete state.rotation;
    delete state.scale;
    delete state.parent;

    widget.applyInitialDelta(state);
    target.appendChild(widget.domElement);
    if(widget instanceof Card)
      widget.deck.removeCard(widget);
    return widget.domElement;
  }

  renderWidgetButton(widget, state, target) {
    const button = document.createElement('button');
    button.className = 'widgetSelectionButton';
    target.appendChild(button);

    let deckDOM = null;
    if(widget instanceof Deck && widget.get('type') != 'deck')
      deckDOM = this.renderWidget(widget, state, button);

    if(widget.get('type') == 'deck') {
      const parent = this.renderWidget(new BasicWidget(), {}, button);
      widgets.set(widget.id, widget);
      for(const cardType of shuffleArray(Object.keys(widget.get('cardTypes'))).slice(0, 5)) {
        this.renderWidget(new Card(), Object.assign({
          deck: widget.id,
          cardType,
          activeFace: widget.get('faceTemplates').length > 1 ? 1 : 0
        }, state), parent);
      }
      widgets.delete(widget.id, widget);
      positionElementsInArc(parent.children, parent.children[0].clientHeight, 45, parent);
    } else {
      this.renderWidget(widget, state, button);
    }

    if(deckDOM)
      deckDOM.remove();

    const rect = getBoundingClientRectWithAbsoluteChildren(button.children[0]);
    if(Math.max(rect.width, rect.height) > 140)
      button.children[0].style.transform = `scale(${140/Math.max(rect.width, rect.height)})`;
    centerElementInClientRect(button.children[0], button.getBoundingClientRect());

    return button;
  }

  renderModule(target) {
    target.innerText = 'Properties module not implemented yet.';
  }
}
