// Fake phone camera for testing an AR page in a desktop browser (the built-in browser has no camera).
// Shows the layout PNG on a green background so MindAR can track it.
// Use in a temporary, uncommitted copy of the page (e.g. <folder>/test.html), as the FIRST thing in <head>:
//   <script src="../tools/fake-camera.js" data-img="../tools/work/maket.png"></script>
(function () {
  var src = document.currentScript.getAttribute('data-img');
  navigator.mediaDevices.getUserMedia = async function () {
    var c = document.createElement('canvas');
    c.width = 1280; c.height = 720;
    var ctx = c.getContext('2d');
    var img = new Image();
    img.src = src;
    await img.decode();
    (function draw() {
      ctx.fillStyle = '#6b5';
      ctx.fillRect(0, 0, 1280, 720);
      ctx.drawImage(img, 390, 110, 500, 500 * img.height / img.width);
      requestAnimationFrame(draw);
    })();
    return c.captureStream(30);
  };
  navigator.mediaDevices.enumerateDevices = async function () {
    return [{ kind: 'videoinput', deviceId: 'fake', label: 'fake' }];
  };
})();
