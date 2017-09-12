// styles
import "./lib/styles/map.css";
import "./lib/styles/narrative.css";
import "./lib/styles/request-form.css";
import "./lib/styles/tabs.css";
import "./lib/styles/topo.css";
import "./client.css";

// html
import "./index.html"
import "./config.js"

var $ = window.$
var Backbone = require("backbone")
var L = require("leaflet")
var OTP = require("./lib/index.js");

// full: http://stackoverflow.com/questions/13029904/twitter-bootstrap-add-class-to-body-referring-to-its-mode
// Assigns class to body based on the width of screen
// This is used to move narrative from sidebar to own tab in small screens
function assign_bootstrap_mode () {
  var width = $(window).width()
  var mode = ''
  var nar = $('#narrative').detach()
  if (width < 768) {
    mode = 'mode-xs'
    nar.appendTo('#plan')
  } else if (width < 992) {
    mode = 'mode-sm'
    nar.appendTo('#sidebar')
  } else {
    mode = 'mode-md'
    nar.appendTo('#sidebar')
  }

  $('body').removeClass('mode-md').removeClass('mode-sm').removeClass('mode-xs').addClass(mode)
}

$(document).ready(function () {
  var log = OTP.log('client')

  // set up the leafet map object
  var map = L.map('map').setView(window.OTP_config.initLatLng, (window.OTP_config.initZoom || 13))
  map.attributionControl.setPrefix('')

  // create OpenStreetMap tile layers for streets and aerial imagery
  var osmLayer = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={token}', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox.streets',
        token: window.OTP_config.osmMapKey
  })
  
  var aerialLayer = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={token}', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox.satellite',
        token: window.OTP_config.osmMapKey
  })
    

  // create a leaflet layer control and add it to the map
  var baseLayers = {
    'Street Map': osmLayer,
    'Satellite Map': aerialLayer
  }
  L.control.layers(baseLayers).addTo(map)

  // display the OSM street layer by default
  osmLayer.addTo(map)

  // create a data model for the currently visible stops, and point it
  // to the corresponding API method
  var stopsRequestModel = new OTP.StopsInRectangleRequest()
  stopsRequestModel.urlRoot = window.OTP_config.otpApi + 'default/index/stops'

  // create the stops request view, which monitors the map and updates the
  // bounds of the visible stops request as the viewable area changes
  new OTP.StopsRequestMapView({ // eslint-disable-line no-new
    model: stopsRequestModel,
    map: map
  })

  // create the stops response view, which refreshes the stop markers on the
  // map whenever the underlying visible stops model changes
  var stopsResponseMapView = new OTP.StopsResponseMapView({
    map: map
  })
  stopsRequestModel.on('success', function (response) {
    stopsResponseMapView.newResponse(response)
  })

  // create the main OTP trip plan request model and point it to the API
  var requestModel = new OTP.PlanRequest()
  requestModel.urlRoot = window.OTP_config.otpApi + 'default/plan'

  // create and render the main request view, which displays the trip
  // preference form
  var requestView = new OTP.RequestForm({
    model: requestModel,
    map: map,
    el: $('#request')
  })

  // create and render the request map view, which handles the map-specific
  // trip request elements( e.g. the start and end markers)
  var requestMapView = new OTP.RequestMapView({
    model: requestModel,
    map: map
  })

  // create the main response view, which refreshes the trip narrative display
  // and map elements as the underlying OTP response changes
  var responseView = new OTP.PlanResponseView({
    narrative: $('#narrative'),
    map: map
  })

  // instruct the response view to listen to relevant request model events

  var Router = Backbone.Router.extend({
    routes: {
      'start/:lat/:lon/:zoom': 'start',
      'start/:lat/:lon/:zoom/:routerId': 'startWithRouterId',
      'plan(?*querystring)': 'plan'
    },
    start: function (lat, lon, zoom) {
      map.setView(L.latLng(lat, lon), zoom)
    },
    startWithRouterId: function (lat, lon, zoom, routerId) {
      window.OTP_config.routerId = routerId

      requestModel.urlRoot = window.OTP_config.otpApi + routerId + '/plan'
      map.setView(L.latLng(lat, lon), zoom)
    },
    plan: function (querystring) {
      log('loading plan from querystring')
      requestModel.fromQueryString(querystring)
    }
  })

  var router = new Router()

  requestModel.on('change', function () {
    log('replacing url')
    router.navigate('plan' + requestModel.toQueryString(), { trigger: false })
  })
  requestModel.on('success', function (response) {
    responseView.newResponse(null, response)
  })
  requestModel.on('failure', function (error) {
    log('handling failure')
    responseView.newResponse(error, false)
  })

  log('rendering request views')

  requestMapView.render()
  requestView.render()

  log('starting router')

  Backbone.history.start()

  // make the UI responsive to resizing of the containing window
  function resize () {
    var height = $(window).height()
    $('#map').height(height)
    $('#sidebar').height(height)
    map.invalidateSize()
    assign_bootstrap_mode()
  }

  $(document).on('shown.bs.tab', 'a.formap', function () {
    map.invalidateSize()
  })

  $(window).resize(resize)
  resize()
  $('#tabs').tab()
  map.invalidateSize()
  assign_bootstrap_mode()
})