'use strict';

crop.factory('cropUserMedia', ['$window',function ($window) {
    var hasUserMedia = function () {
        return !!getUserMedia();
    }

    var getUserMedia = function () {
        navigator.getUserMedia = ($window.navigator.getUserMedia ||
            $window.navigator.webkitGetUserMedia ||
            $window.navigator.mozGetUserMedia ||
            $window.navigator.msGetUserMedia);
        return navigator.getUserMedia;
    }
    var requestAnimFrame = (function () {
        return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
                return window.setTimeout(callback, 1000 / 60);
            };
    })();
    var convertDataURIToBinary = function (dataURI) {
        var BASE64_MARKER = ';base64,';
        var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
        var base64 = dataURI.substring(base64Index);
        var raw = window.atob(base64);
        var rawLength = raw.length;
        var array = new Uint8Array(new ArrayBuffer(rawLength));

        for (var i = 0; i < rawLength; i++) {
            array[i] = raw.charCodeAt(i);
        }
        return array;
    }
    return {
        hasUserMedia: hasUserMedia(),
        getUserMedia: getUserMedia,
        requestAnimFrame: requestAnimFrame,
        convertDataURIToBinary: convertDataURIToBinary
    }
}]);