class Widget extends Draggable {
  constructor(object, surface) {
    const div = document.createElement('div');

    div.id = object.id;
    div.className = 'widget';
    div.innerHTML = object.content || '';
    div.style.cssText = object.css || '';
    div.style.width = (object.width || 103) + 'px';
    div.style.height = (object.height || 160) + 'px';
    div.style.zIndex = (object.z || 0);

    surface.appendChild(div);
    super(div, surface);

    this.setPositionFromServer(object.x || 0, object.y || 0)
  }
}
