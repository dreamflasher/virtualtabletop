import { Selector, ClientFunction } from 'testcafe';

import { escapeID } from '../../client/js/domhelpers.js';
import { compareState, prepareClient, setName, setupTestEnvironment } from './test-util.js';

setupTestEnvironment();

async function removeGame(t, index) {
  await t
    .pressKey('esc')
    .click('#statesButton')
    .hover(`.roomState:nth-of-type(${index || 1})`)
    .click(`.roomState:nth-of-type(${index || 1}) .edit`)
    .click('.remove-game');
}

function publicLibraryTest(game, variant, md5, tests) {
  test(`Public library: ${game} (variant ${variant})`, async t => {
    await ClientFunction(prepareClient)();
    await ClientFunction(_=>Math.random())(); // game library overhaul removed the Math.random call for generating a new state ID
    await t
      .pressKey('esc')
      .click('#statesButton')
      .click('#filterByType')
      .click('#filterByType > option:nth-child(1)')
      .click(Selector('.roomState h3').withExactText(game).parent().parent())
      .click(Selector(`.variantsList > div:nth-child(${variant+1}) > button`));
    await setName(t);
    await tests(t);
    await compareState(t, md5);
  });
}

function publicLibraryButtons(game, variant, md5, tests) {
  publicLibraryTest(game, variant, md5, async t => {
      for(const b of tests)
        if(typeof b == "string") {
          if(b.charAt(0) == '#') {
            await t.click(b);
          } else {
            await t.click(`#w_${escapeID(b)}`);
          }
        } else {
          await t.dragToElement(b[0](), b[1](), { speed:0.5 });
        }
  });
}

publicLibraryButtons('Blue',               0, '50a9596d38d0d5edc5d6c3eecc3c5b5d', ["player1Seat","player2Seat","player3Seat","player4Seat",
  'Deal_button', 'e36b',
  'd3ab9f5f-daa4-4d81-8004-50a9c90af88e_incrementButton', 'd3ab9f5f-daa4-4d81-8004-50a9c90af88e_decrementButton',
  'reset_button', '#buttonInputGo', 'visibility_button'
]);
publicLibraryButtons('Bhukhar',            0, 'c32671a16623cc91202fbba4d62f3371', [ 'btnMenuSettings', 'btn8Players', 'btn4Packs', 'btnCloseSettings', 'btnSelectPlayer', 'btnDeal', 'btnPile4', 'btnStartGame', 'btnTakeOne', 'btnNextPlayer', 'btnPickUp' ]);
publicLibraryButtons('Dice',               0, 'a68d28c20b624d6ddf87149bae230598', [ 'k18u', 'hy65', 'gghr', 'dsfa', 'f34a', 'fusq' ]);
publicLibraryButtons('Dots',               0, '23894df38f786cb014fa1cd79f2345db', [ 'reset', '#buttonInputGo', 'col11', 'col21', 'col12', 'col22', 'row11', 'row31', 'row21', 'row32', 'row12', 'row42', 'row22', 'row23', 'col23' ]);
publicLibraryButtons('Solitaire',          0, 'e83b2d21474496df86cd3dd2540efe58', [ 'reset', 'jemz', 'reset' ]);
publicLibraryButtons('Mancala',            0, '92108a0e76fd295fee9881b6c7f8928b', ['btnRule1', 'btnRule2', 'getb5', 'getb5', 'getb5', 'getb5', 'getb1', 'getb1', 'getb1', 'getb1' ]);
publicLibraryButtons('Reversi',            0, '35e0017570f9ecd206a2317c1528be36',
       [
         [ ()=>Selector("#w_zpiece15"), ()=>Selector("#w_sq23") ],
         [ ()=>Selector("#w_zpiece78"), ()=>Selector("#w_sq22") ],
         [ ()=>Selector("#w_zpiece40"), ()=>Selector("#w_sq32") ],
         [ ()=>Selector("#w_zpiece72"), ()=>Selector("#w_sq12") ],
         [ ()=>Selector("#w_zpiece72"), ()=>Selector("#w_sq24") ],
         [ ()=>Selector("#w_zpiece19"), ()=>Selector("#w_sq35") ],
         [ ()=>Selector("#w_zpiece08"), ()=>Selector("#w_sq53") ]
       ]);
publicLibraryButtons('Reward',             0, '965cc73a5dc1048c3203ab23935b4abf', [
  'gmex', 'kprc', 'oksq', 'j1wz', 'vfhn', 'seat1', 'next'
]);
publicLibraryButtons('Rummy Tiles',        0, 'ab2a2638cdb61809a644c5ca73770f77', [ 'startMix', 'draw14' ]);
publicLibraryButtons('Undercover',         1, '8512b8cb117a694ee7e201869999e571', [ 'Reset', 'Spy Master Button' ]);
publicLibraryButtons('Functions - CALL',   0, '15bc313f5adc00d310adb07ee2d6059a', [
  'n4cw_8_C', '5a52', '5a52', '66kr', 'qeg1', 'n4cwB', '8r6p', 'qeg1', 'qeg1', 'n5eu'
]);
publicLibraryButtons('Functions - CLICK',  0, 'd44e77e0782cadbc9594494e5a83dde0', [ '7u2q' ]);
publicLibraryButtons('Functions - ROTATE', 0, '241d87e4b6b825f8835893a2dd5dbdcc', [ 'c44c', '9kdj', 'w53c', 'w53c' ]);
publicLibraryButtons('Functions - SELECT', 2, '3e4652080a097cce27106579afa90e50', [ 'jkmt1']);
publicLibraryButtons('Functions - SORT',   1, '9e83c7e238dcab8a28f59f8d1ccc5b97', [
  'ingw', 'k131', 'cnfu', 'i6yz', 'z394', '0v3h', '1h8o', 'v5ra', 'ingw-copy001', 'k131-copy001', 'cnfu-copy001',
  'i6yz-copy001', 'z394-copy001', '0v3h-copy001'
]);
publicLibraryButtons('Master Button',      0, 'eb19dffdb38641d5556e5fdb2c47c62b', [
  'masterbutton', 'redbutton', 'orangebutton', 'yellowbutton', 'greenbutton', 'bluebutton', 'indigobutton',
  'violetbutton', 'fae4', 'vbx5'
]);
publicLibraryButtons('Functions - SCORE', 0, '88c8ef94e7d34f69bf8d0844acce2dfc', [ 'button2', 'button2', 'button7', 'button15', 'seat9', 'scorePlus', 'button17']);
publicLibraryButtons('Scoreboard', 2, '458a8e4b7232bc38e151be7e4c7705bf', [ 'button1', 'button2', 'button3', 'button4']);
