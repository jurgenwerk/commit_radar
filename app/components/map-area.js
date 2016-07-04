import Ember from 'ember';
import ENV from '../config/environment'

export default Ember.Component.extend({
  cableService: Ember.inject.service('cable'),
  geocoder: Ember.inject.service(),

  dataIndex: 0,
  markerWidth: 6,
  lastMarkerAddedTimestamp: 0,
  minimumMilisecondsBetween: 500,
  addedMarkers: [],
  commitsShowing: false,

  saveLocation(name, latitude, longitude, author) {
    this.subscription.perform("save_location", { location_name: name, latitude: latitude, longitude: longitude, author: author });
  },

  truncate(v, n) {
    return (v.length > n) ? v.substr(0, n-1) + '&hellip;' : v;
  },

  spawnCirclePulse(idx, location, author) {
    const markerElement = $(`circle[data-index=${idx}]`);
    const mapOffset = $('.jvectormap-container svg').offset()
    const x = parseInt(markerElement.attr('cx')) + mapOffset.left - this.markerWidth/2;
    const y = parseInt(markerElement.attr('cy')) + mapOffset.top - this.markerWidth/2;

    $('.middle-stripe').fadeOut('fast');

    const $circle =
      $(`<div class="radar-circle">
           <div class="radar-circle-content">
             ${this.truncate(location.split(',')[0], 15)}
           <div class="author">
             <a href="https://github.com/${author}" target="_blank" class="gh-link">@${author}</a>
           <div>
         </div></div>`);

    let circleWidth = 255;
    if (document.documentElement.clientWidth < 700) {
      circleWidth = 170;
    }

    $circle.css({top: `${y}px`, left: `${x}px`});
    $circle.animate({
        'width': `${circleWidth}px`,
        'height': `${circleWidth}px`,
        'margin-top': `${-circleWidth/2}px`,
        'margin-left': `${-circleWidth/2}px`,
        'background': 'rgba(255, 92, 0, 0.01)'
      }, 1900, 'easeOutCirc');

    $('body').append($circle);
    $circle.fadeOut('slow', () => $circle.remove());
  },

  addMarker(location, lat, lon, author) {
    if (!location || !lat || !lon) {
      return;
    }

    let waitFor = Math.random() * 5000;

    Em.run.later(() => {
      this.set('place', location);
      const markerName = `${location} <br> @${author}`
      this.mapObject.addMarker(this.dataIndex, {latLng: [lat, lon], name: markerName});
      this.spawnCirclePulse(this.dataIndex, location, author);
      this.addedMarkers.push([this.dataIndex, Date.now()]);
      this.dataIndex++;
      this.lastMarkerAddedTimestamp = Date.now();
    }, waitFor);
  },

  drawMap() {
    this.$('#map_area').css('height', document.documentElement.clientHeight - 150);
    this.$('#map_area').vectorMap({
      map: 'world_mill',
      backgroundColor: '#fff',
      zoomOnScroll: false,
      markerStyle: {
        initial: {
          fill: '#fff',
          stroke: '#ee5d31',
          "stroke-width": 4,
          r: 5,
          "fill-opacity": 1,
          "stroke-opacity": 1
        }
      },
      regionStyle: {
        initial: {
          stroke: '#a3cfec',
          fill: '#2b90d9',
          "stroke-width": 1,
          "stroke-opacity": 0.1,
          "fill-opacity": 0
        }
      },
      onMarkerTipShow(event, label, index){
        const labelParts = label.html().split("&lt;br&gt;");
        const location = labelParts[0];
        const author = labelParts[1];
        label.html(
          `<div class='commit-location'>${location}</div><div class='commit-author'>${author}</div>`
        );
      }
    });
    this.mapObject = $('#map_area').vectorMap('get', 'mapObject');
    this.countryKeys = Object.keys(this.mapObject.regions);
  },

  consumeMessages() {
    let didReceiveMessage = (msg) => {
      if (!this.commitsShowing) {
        return;
      }

      if (msg.author_location && msg.latitude && msg.longitude) {
        Ember.Logger.info(`Adding marker from cached location: ${msg.author_location}`);
        this.addMarker(msg.author_location, msg.latitude, msg.longitude, msg.author);
      } else {
        const tryNominatimFirst = this.dataIndex % 2 == 0;
        this.get('geocoder').geocode(msg.author_location, tryNominatimFirst).then((locationData) => {
          Ember.Logger.info(`Resolved ${locationData.location} ${locationData.latitude} ${locationData.longitude}`);
          this.saveLocation(locationData.location, locationData.latitude, locationData.longitude, msg.author);
          this.addMarker(locationData.location, locationData.latitude, locationData.longitude, msg.author);
        })
      }
    }

    const consumer = this.get('cableService').createConsumer(ENV.socketURI);
    this.subscription = consumer.subscriptions.create("RadarChannel", {
      received: didReceiveMessage
    });
  },

  animateMap() {
    return new Ember.RSVP.Promise((resolve, reject) => {
      const _animate = () => {
        Ember.run.later(() => {
          let key = this.countryKeys.shift()
          if (key == undefined) {
            resolve();
          } else {
            this.mapObject.regions[key].element.setStyle({ "fill-opacity": 1 });
            _animate();
          }
        }, 17);
      }
      _animate();
    });
  },

  graduallyAgeMarkers() {
    Ember.run.later(() => {
      this.ageMarkers();
      this.graduallyAgeMarkers();
    }, 5500);
  },

  ageMarkers() {
    const currentTime = new Date();
    this.addedMarkers.forEach((marker) => {
      const markerIndex = marker[0];
      const mapMarker = this.mapObject.markers[markerIndex];
      const currentStrokeOpacity = Math.round(mapMarker.element.config.style.initial['stroke-opacity'] * 100) / 100;
      const currentFillOpacity = Math.round(mapMarker.element.config.style.initial['stroke-opacity'] * 100) / 100
      const currentRadius = mapMarker.element.config.style.initial.r;

      if (currentStrokeOpacity > 0.2) {
        const newStrokeOpacity = currentStrokeOpacity - 0.05;
        const newFillOpacity = currentFillOpacity - 0.05;
        mapMarker.element.config.style.initial['stroke-opacity'] = newStrokeOpacity;
        mapMarker.element.config.style.initial['fill-opacity'] = newFillOpacity;
        $(`circle[data-index=${markerIndex}]`).attr('stroke-opacity', newStrokeOpacity);
        $(`circle[data-index=${markerIndex}]`).attr('fill-opacity', newFillOpacity);
      }
    })
  },

  didInsertElement() {
    this._super(...arguments);
    this.consumeMessages();
    this.drawMap();
    this.animateMap().then(() => {
      $('.middle-stripe-text span').addClass('pulsate');
      this.commitsShowing = true;
    });
    this.graduallyAgeMarkers();
  }
});
