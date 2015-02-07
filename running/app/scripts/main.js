/*global Running, $*/

window.Running = {
    Models: {},
    Collections: {},
    Views: {},
    Routers: {},
    init: function () {
        this.app = new this.Routers.App();
    }
};

$(document).ready(function () {
    'use strict';
    Running.init();
});
