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

    const $circle =
      $(`<div class="radar-circle">
           <div class="radar-circle-content">
             ${this.truncate(location.split(',')[0], 15)}
           <div class="author">
             <a href="https://github.com/${author}" target="_blank" class="gh-link">@${author}</a>
           <div>
         </div></div>`);
    const circleWidth = 260;

    $circle.css({top: `${y}px`, left: `${x}px`});
    $circle.animate({
        'width': `${circleWidth}px`,
        'height': `${circleWidth}px`,
        'margin-top': `${-circleWidth/2}px`,
        'margin-left': `${-circleWidth/2}px`,
        'background': 'rgba(255, 92, 0, 0.01)'
      }, 2100, 'easeOutCirc');

    $('body').append($circle);
    $circle.fadeOut('slow', () => $circle.remove());
  },

  addMarker(location, lat, lon, author) {
    if (!location || !lat || !lon) {
      return;
    }

    let waitFor = 0;
    const currentTimestamp = Date.now();
    const timeDiff = currentTimestamp - this.lastMarkerAddedTimestamp;

    if (timeDiff < this.minimumMilisecondsBetween) {
      waitFor = (this.minimumMilisecondsBetween - timeDiff) + Math.random() * 10000;
    }

    Em.run.later(() => {
      this.set('place', location)
      this.mapObject.addMarker(this.dataIndex, {latLng: [lat, lon], name: location});
      this.spawnCirclePulse(this.dataIndex, location, author);
      this.addedMarkers.push([this.dataIndex, Date.now()]);
      this.dataIndex++;
      this.lastMarkerAddedTimestamp = Date.now();
      // this.bleep();
    }, waitFor);
  },

  bleep() {
    let snd = new Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");
    snd.play();
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
          "stroke-opacity": 0.1
        }
      }
    });
    this.mapObject = $('#map_area').vectorMap('get', 'mapObject');
  },

  consumeMessages() {
    let didReceiveMessage = (msg) => {
      if (msg.author_location && msg.latitude && msg.longitude) {
        console.log(`Adding marker from cached location: ${msg.author_location}`);
        this.addMarker(msg.author_location, msg.latitude, msg.longitude, msg.author);
      } else {
        const tryNominatimFirst = this.dataIndex % 3 == 0;
        this.get('geocoder').geocode(msg.author_location, tryNominatimFirst).then((locationData) => {
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

  graduallyAgeMarkers() {
    Ember.run.later(() => {
      this.ageMarkers();
      this.graduallyAgeMarkers();
    }, 7000);
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

      // if (currentStrokeOpacity == 0.7 || currentStrokeOpacity == 0.5) {
      //   const newRadius = currentRadius - 1;
      //   mapMarker.element.config.style.initial.r = newRadius;
      //   $(`circle[data-index=${markerIndex}]`).attr('r', newRadius);
      // }
    })
  },

  didInsertElement() {
    this._super(...arguments);
    this.consumeMessages();
    this.drawMap();
    this.graduallyAgeMarkers();
  }
});
