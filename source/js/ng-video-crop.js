'use strict';

crop.directive('videoCrop', ['$q', '$timeout', 'cropHost', 'cropPubSub', 'cropUserMedia', function ($q, $timeout, CropHost, CropPubSub, cropUserMedia) {
  var requestAnimFrame = cropUserMedia.requestAnimFrame;

  return {
    restrict: 'E',
    scope: {
      image: '=',
      resultImage: '=',
      disparidadeangulo: '=',
      disparidadeolhos: '=',

      callback: '=',
      blockcallback: '=',
      play: '=',
      changeOnFly: '=',
      areaType: '@',
      areaMinSize: '=',
      resultImageSize: '=',
      resultImageFormat: '@',
      resultImageQuality: '=',

      onChange: '&',
      onLoadBegin: '&',
      onLoadDone: '&',
      onLoadError: '&'
    },
    template: '<video class="rec-facial-video" style="border: 3px solid #EEE;position:static;display:none;" width="500" height="400" ></video><canvas id="mask" class="mask" style="border: 3px solid #EEE;position:static;" width="500px" height="500px"></canvas><canvas id="final" style="border: 3px solid #EEE;position:static;"></canvas>',
    controller: ['$scope', function ($scope) {
      $scope.events = new CropPubSub();
    }],
    compile: function compile(tElement, tAttrs, transclude) {
      return {
        pre: function preLink(scope, ele, attrs) {
          var p_oculta = attrs.oculta || false;
          scope.oculta = p_oculta;
          if (!cropUserMedia.hasUserMedia) return;

          navigator.getUserMedia = cropUserMedia.getUserMedia();
          var w = attrs.width || 520,
            h = attrs.height || 400;
          scope.w = w;
          scope.h = h;

          scope.overlay = document.getElementById('mask');
          angular.element(ele.find('canvas')).prop('width', 500).prop('height', 500);
          scope.overlayCC = scope.overlay.getContext('2d');
          scope.overlayCC.font = "30px Arial";

          scope.overlayCC.translate(500, 0);
          scope.overlayCC.scale(-1, 1);
          var _second = 1000;
          var _minute = _second * 60;
          var _hour = _minute * 60;
          var _day = _hour * 24;
          var ctracker;
          // Init Events Manager
          var events = scope.events;

          // Init Crop Host
          var cropHost = new CropHost(angular.element([ele.find('canvas')[1]]), {}, events);

          // Store Result Image to check if it's changed
          var storedResultImage;

          var updateResultImage = function (scope) {
            var resultImage = cropHost.getResultImageDataURI();
            if (storedResultImage !== resultImage) {
              storedResultImage = resultImage;
              scope.onChange({ $dataURI: resultImage });
            }
          };

          // Wrapper to safely exec functions within $apply on a running $digest cycle
          var fnSafeApply = function (fn) {
            return function () {
              $timeout(function () {
                scope.$apply(function (scope) {
                  fn(scope);
                });
              });
            };
          };

          // Setup CropHost Event Handlers
          events
            .on('load-start', fnSafeApply(function (scope) {
              scope.onLoadBegin({});
            }))
            .on('load-done', fnSafeApply(function (scope) {
              scope.onLoadDone({});
            }))
            .on('load-error', fnSafeApply(function (scope) {
              scope.onLoadError({});
            }))
            .on('area-move area-resize', fnSafeApply(function (scope) {
              updateResultImage(scope);

            }))
            .on('area-move-end area-resize-end image-updated', fnSafeApply(function (scope) {
              updateResultImage(scope);
            }));

          scope.$watch('areaType', function () {
            cropHost.setAreaType('circle');
            updateResultImage(scope);
          });
          scope.$watch('areaMinSize', function () {
            cropHost.setAreaMinSize(50);
            updateResultImage(scope);
          });
          scope.$watch('resultImageSize', function () {
            cropHost.setResultImageSize(scope.resultImageSize);
            updateResultImage(scope);
          });
          scope.$watch('resultImageFormat', function () {
            cropHost.setResultImageFormat(scope.resultImageFormat);
            updateResultImage(scope);
          });
          scope.$watch('resultImageQuality', function () {
            cropHost.setResultImageQuality(scope.resultImageQuality);
            updateResultImage(scope);
          });

          // Update CropHost dimensions when the directive element is resized
          scope.$watch(
            function () {
              return [ele[0].clientWidth, ele[0].clientHeight];
            },
            function (value) {
              cropHost.setMaxDimensions(value[0], value[1]);
              updateResultImage(scope);
            },
            true
          );

          // Destroy CropHost Instance when the directive is destroying
          scope.$on('$destroy', function () {
            cropHost.destroy();
          });
          //////////////////////////////////////////////////////////////////////////////////////////////////////////
          scope.$watch("play", function (can_play) {
            if (can_play) {
              play();
            } else {
              stop();
            }
          })

          function stop() {
            if (!!ctracker) {
              ctracker.stop();
              var videoElement = document.querySelector('video');
              if (!!videoElement) {
                var checker = typeof videoElement.getVideoTracks === 'function';
                if (videoElement.getVideoTracks && checker) {
                  var tracks = videoElement.getVideoTracks();
                  if (tracks && tracks[0] && tracks[0].stop) {
                    tracks[0].stop();
                  }
                } else if (videoElement.stop) {
                  // deprecated, may be removed in the near future
                  videoElement.stop();
                }
              }
              if (!!videoElement) {
                delete videoElement.src;
              }
            }
          }

          function play() {
            navigator.getUserMedia(
              {
                video: {
                  mandatory: {
                    minHeight: h,
                    minWidth: w
                  }
                },
                audio: false
              }, function (stream) {
                scope.videoElement = document.querySelector('video');
                scope.videoElement.pause();
                if (navigator.mozGetUserMedia) {
                  scope.videoElement.mozSrcObject = stream;
                } else {
                  var vendorURL = window.URL || window.webkitURL;
                  scope.videoElement.src = window.URL.createObjectURL(stream);
                }
                // Just to make sure it autoplays
                scope.videoElement.play();
                if(typeof clm  !== 'undefined') {
                  if (!ctracker)
                    ctracker = new clm.tracker();

                  ctracker.init(pModel);
                  ctracker.start(scope.videoElement);
                }
                scope.end = new Date();

                drawLoop();
              }, function (err) {

              });
          }

          var maxX = 0;
          var minX = 0;
          var maxY = 0;
          var minY = 0;
          function drawLoop() {
            if (scope.play)
              requestAnimFrame(drawLoop);
            if (!scope.$$phase) {
              scope.$apply(function () {
                scope.overlayCC.clearRect(0, 0, 500, 400);
                scope.overlayCC.drawImage(scope.videoElement, 0, 0);
                if(typeof clm  !== 'undefined')
                if (ctracker.getCurrentPosition() && scope.dataimgretorno == null) {
                  var now = new Date();
                  var distance = now - scope.end;
                  var seconds = Math.floor((distance % _minute) / _second);

                  var valuesX = ctracker.getCurrentPosition().map(function (elt) { return elt[0]; });
                  var valuesY = ctracker.getCurrentPosition().map(function (elt) { return elt[1]; });

                  var n_maxX = Math.max.apply(null, valuesX);
                  var n_minX = Math.min.apply(null, valuesX);
                  var n_maxY = Math.max.apply(null, valuesY);
                  var n_minY = Math.min.apply(null, valuesY);

                  if (n_maxX > maxX + 2 || n_minX < minX - 2)
                    maxX = n_maxX;
                  if (n_minX > minX + 2 || n_minX < minX - 2)
                    minX = n_minX;
                  if (n_maxY > maxY + 2 || n_maxY < maxY - 2)
                    maxY = n_maxY;
                  if (n_minY > minY + 2 || n_minY < minY - 2)
                    minY = n_minY;

                  scope.disparidadeangulo = !(valuesY[0] > valuesY[14] - 8 && valuesY[14] > valuesY[0] - 8);
                  scope.disparidadeolhos = (valuesX[23] - valuesX[0]) - (valuesX[14] - valuesX[28]);
                }
                if (!scope.blockcallback)
                  cropHost.UpdateImageSource(scope.overlay.toDataURL("image/jpg"));
              })
            }
          }
        }

      }
    }
  };
}]);