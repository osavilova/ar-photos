// Shared AR-photo page. Each photo folder sets window.AR_PHOTO and loads this file.
//
// window.AR_PHOTO = {
//   target:  'target.mind',            // compiled from the layout PNG
//   video:   'video.mp4',
//   overlay: 'overlay.png',            // optional: tape / QR drawn above the video
//   layout:  { width: 3024, height: 3024 },                  // layout PNG size, px
//   photo:   { x: 330, y: 330, width: 2364, height: 2364 },  // photo area in the layout, px
// };
(function () {
  var cfg = window.AR_PHOTO;

  // MindAR makes the target 1 unit wide; y grows upwards from the target centre.
  var unit = 1 / cfg.layout.width;
  var targetHeight = cfg.layout.height * unit;
  var photoW = cfg.photo.width * unit;
  var photoH = cfg.photo.height * unit;
  var photoX = (cfg.photo.x + cfg.photo.width / 2) * unit - 0.5;
  var photoY = targetHeight / 2 - (cfg.photo.y + cfg.photo.height / 2) * unit;

  // Scale the video to fill the photo area without distortion, cropping the overflow evenly.
  AFRAME.registerComponent('cover-fit', {
    schema: { video: { type: 'selector' } },
    init: function () {
      var el = this.el;
      var video = this.data.video;
      var fit = function () {
        var mesh = el.getObject3D('mesh');
        var map = mesh && mesh.material && mesh.material.map;
        if (!map || !video.videoWidth) return;
        var videoAspect = video.videoWidth / video.videoHeight;
        var photoAspect = photoW / photoH;
        map.repeat.set(1, 1);
        if (videoAspect > photoAspect) map.repeat.x = photoAspect / videoAspect;
        else map.repeat.y = videoAspect / photoAspect;
        map.offset.set((1 - map.repeat.x) / 2, (1 - map.repeat.y) / 2);
        map.needsUpdate = true;
      };
      el.addEventListener('materialtextureloaded', fit);
      video.addEventListener('loadedmetadata', fit);
    }
  });

  var overlayPlane = cfg.overlay
    ? '<a-plane src="#ar-overlay" width="1" height="' + targetHeight + '" position="0 0 0.002"' +
      ' material="shader: flat; transparent: true; alphaTest: 0.01"></a-plane>'
    : '';

  document.body.insertAdjacentHTML('beforeend',
    '<a-scene mindar-image="imageTargetSrc: ' + cfg.target + '; maxTrack: 1; uiScanning: no; filterMinCF: 0.0001; filterBeta: 0.001"' +
    ' color-space="sRGB" renderer="colorManagement: true" vr-mode-ui="enabled: false"' +
    ' device-orientation-permission-ui="enabled: false">' +
    '  <a-assets timeout="10000">' +
    '    <video id="ar-video" src="' + cfg.video + '" preload="auto" loop muted playsinline webkit-playsinline crossorigin="anonymous"></video>' +
    (cfg.overlay ? '<img id="ar-overlay" src="' + cfg.overlay + '" crossorigin="anonymous">' : '') +
    '  </a-assets>' +
    '  <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>' +
    '  <a-entity id="ar-target" mindar-image-target="targetIndex: 0">' +
    '    <a-plane src="#ar-video" width="' + photoW + '" height="' + photoH + '"' +
    '      position="' + photoX + ' ' + photoY + ' 0" material="shader: flat" cover-fit="video: #ar-video"></a-plane>' +
    overlayPlane +
    '  </a-entity>' +
    '</a-scene>' +
    '<div class="ar-ui ar-hint" id="ar-hint">Наведіть камеру на фото</div>' +
    '<div class="ar-ui ar-sound ar-hidden" id="ar-sound">🔇 Торкніться екрана, щоб увімкнути звук</div>' +
    '<button class="ar-ui ar-open" id="ar-open" type="button">Переглянути відео окремо</button>' +
    '<div class="ar-modal" id="ar-modal" hidden>' +
    '  <video id="ar-plain-video" src="' + cfg.video + '" controls playsinline webkit-playsinline preload="none"></video>' +
    '  <button class="ar-close" id="ar-close" type="button" aria-label="Закрити">✕</button>' +
    '</div>'
  );

  var $ = function (id) { return document.getElementById(id); };
  var scene = document.querySelector('a-scene');
  var video = $('ar-video');
  var hint = $('ar-hint');
  var sound = $('ar-sound');
  var openBtn = $('ar-open');
  var modal = $('ar-modal');
  var plainVideo = $('ar-plain-video');
  var visible = false;

  var show = function (el, on) { el.classList.toggle('ar-hidden', !on); };

  $('ar-target').addEventListener('targetFound', function () {
    visible = true;
    show(hint, false);
    show(sound, video.muted);
    video.play().catch(function () {});
  });

  $('ar-target').addEventListener('targetLost', function () {
    visible = false;
    show(hint, true);
    show(sound, false);
    video.pause();
  });

  // iOS Safari only allows sound after a user gesture, so any tap turns it on.
  document.addEventListener('click', function (e) {
    if (modal.contains(e.target) || e.target === openBtn) return;
    if (!video.muted) return;
    video.muted = false;
    show(sound, false);
    if (visible) video.play().catch(function () {});
  });

  openBtn.addEventListener('click', function () {
    video.pause();
    modal.hidden = false;
    plainVideo.play().catch(function () {});
  });

  $('ar-close').addEventListener('click', function () {
    plainVideo.pause();
    modal.hidden = true;
    if (visible) video.play().catch(function () {});
  });

  // No camera (denied, unsupported browser): point people to the plain video.
  scene.addEventListener('arError', function () {
    hint.textContent = 'Камера недоступна — перегляньте відео окремо';
    openBtn.classList.add('ar-attention');
  });
})();
