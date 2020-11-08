let playerCursors = {};
let playerName = localStorage.getItem('playerName') || 'Guest' + Math.floor(Math.random()*1000);
localStorage.setItem('playerName', playerName);

function addPlayerCursor(playerName, playerColor) {
  playerCursors[playerName] = document.createElement('div');
  playerCursors[playerName].className = 'cursor';
  playerCursors[playerName].style.backgroundColor = playerColor;
  $('#roomArea').appendChild(playerCursors[playerName]);
}

function fillPlayerList(players, activePlayers) {
  for(const entry of $a('#playerList > div'))
    entry.parentNode.removeChild(entry);

  for(const c of $a('#roomArea > .cursor'))
    c.parentNode.removeChild(c);

  for(const player in players) {
    const entry = domByTemplate('template-playerlist-entry');
    $('.teamColor', entry).value = players[player];
    $('.playerName', entry).value = player;
    $('.teamColor', entry).addEventListener('change', function(e) {
      toServer('playerColor', { player, color: e.target.value });
    });
    $('.playerName', entry).addEventListener('change', function(e) {
      toServer('rename', { oldName: player, newName: e.target.value });
    });
    if(player == playerName)
      entry.className = 'myPlayerEntry';
    if(activePlayers.indexOf(player) == -1)
      entry.className = 'inactivePlayerEntry';

    $('#playerList').appendChild(entry);

    if(player != playerName)
      addPlayerCursor(player, players[player]);
  }
}

window.addEventListener('mousemove', function(event) {
  toServer('mouse', [ (event.clientX - roomRectangle.left)/scale, (event.clientY - roomRectangle.top)/scale ]);
});

onLoad(function() {
  onMessage('meta', args=>fillPlayerList(args.meta.players, args.activePlayers));
  onMessage('mouse', function(args) {
    if(args.player != playerName) {
      const x = args.coords[0]*scale;
      const y = args.coords[1]*scale;
      playerCursors[args.player].style.transform = `translate(${x}px, ${y}px)`;
    }
  });
  onMessage('rename', function(args) {
    playerName = args;
    localStorage.setItem('playerName', playerName);
  });
});
