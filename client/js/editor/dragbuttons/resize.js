class ResizeDragButton extends DragButton {
  constructor() {
    super('aspect_ratio', 'Resize', 'Drag to resize the selected widgets.');
  }

  async dragStart() {
    this.dragStartCoords = selectedWidgets.map(w=>[ w, w.get('width'), w.get('height') ]);
  }

  async dragMove(dx, dy, dxViewport, dyViewport) {
    for(const [ widget, startWidth, startHeight ] of this.dragStartCoords) {
      await widget.set('width',  Math.floor(startWidth + dx));
      await widget.set('height', Math.floor(startHeight + dy));
    }

    const minWidth  = Math.min(...selectedWidgets.map(w=>w.get('width')));
    const minHeight = Math.min(...selectedWidgets.map(w=>w.get('height')));

    const maxWidth  = Math.max(...selectedWidgets.map(w=>w.get('width')));
    const maxHeight = Math.max(...selectedWidgets.map(w=>w.get('height')));

    return `
      Width change: <i>${dx>0 ? '+' : ''}${Math.floor(dx)}</i><br>
      Height change: <i>${dy>0 ? '+' : ''}${Math.floor(dy)}</i><br><br>

      Min Width: <i>${minWidth}</i><br>
      Max Width: <i>${maxWidth}</i><br>
      Min Height: <i>${minHeight}</i><br>
      Max Height: <i>${maxHeight}</i>
    `;
  }
}
