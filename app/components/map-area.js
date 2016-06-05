import Ember from 'ember';
import ENV from '../config/environment'

export default Ember.Component.extend({
  cableService: Ember.inject.service('cable'),
  socketURI: 'ws://localhost:3000/cable',

  nominatimUrl: "http://nominatim.openstreetmap.org/search",
  dataIndex: 0,
  markerWidth: 10,

  saveLocation(name, latitude, longitude) {
    this.subscription.perform("save_location", { name: name, latitude: latitude, longitude: longitude });
  },

  spawnCirclePulse(idx, location) {
    const markerElement = $(`circle[data-index=${idx}]`);
    const mapOffset = $('.jvectormap-container svg').offset()
    const x = parseInt(markerElement.attr('cx')) + mapOffset.left - this.markerWidth/2;
    const y = parseInt(markerElement.attr('cy')) + mapOffset.top - this.markerWidth/2;

    const $circle = $(`<div class="radar-circle"><div class="radar-circle-content">${location}</div></div>`);
    const circleWidth = 280;

    $circle.css({top: `${y}px`, left: `${x}px`});
    $circle.animate({
        'width': `${circleWidth}px`,
        'height': `${circleWidth}px`,
        'margin-top': `${-circleWidth/2}px`,
        'margin-left': `${-circleWidth/2}px`,
        'background': 'background: rgba(0,0,255,0.1);'
      }, 2000, 'easeOutCirc');

    $('body').append($circle);

    Em.run.later(() => {
      $circle.fadeOut('slow', () => $circle.remove());
    }, 2100);
  },

  addMarker(location, lat, lon, saveLocation) {
    if (!location || !lat || !lon) {
      return;
    }

    if (saveLocation) {
      console.log(`Caching location to the server: ${location}`);
      this.saveLocation(location, lat, lon);
    }

    let rndMsec = Math.floor(Math.random() * 1000) + 200;

    Em.run.later(() => {
      this.set('place', location)
      let mapObject = $('#map_area').vectorMap('get', 'mapObject');
      mapObject.addMarker(this.dataIndex, {latLng: [lat, lon], name: location});
      this.spawnCirclePulse(this.dataIndex, location);
      this.dataIndex++;
      // this.bleep();
    }, rndMsec);
  },

  tryNominatim(location) {
    console.log(`Trying nominatim: ${location}`);
    let locationParam = location.replace(/\s+/g, " ").trim().split(" ").join("+");
    Ember.$.getJSON(this.get('nominatimUrl') + `?format=json&q=${locationParam}`).then((data) => {
      if (data[0] && data[0].lat && data[0].lon) {
        this.addMarker(location, data[0].lat, data[0].lon, true);
      }
    });
  },

  tryGoogle(location) {
    console.log(`Trying google: ${location}`);
    let geocoder = new google.maps.Geocoder();
    geocoder.geocode({'address': location}, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK) {
        let coords = results[0].geometry.location;

        let latitude = coords.H;
        let longitude = coords.L;

        if (!latitude) {
          latitude = results[0].geometry.location.lat();
        }

        if (!longitude) {
          longitude = results[0].geometry.location.lng();
        }

        this.addMarker(location, latitude, longitude, true);
      }
      else if (status == google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
        console.log('google over limit, trying nominatim...');
        this.tryNominatim(location);
      } else {
        console.log('google geocode fail: ' + status);
      }
    });
  },

  bleep() {
    let snd = new Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");
    snd.play();
  },

  drawMap() {
    this.$('#map_area').vectorMap({
      map: 'world_mill',
      backgroundColor: '#282C34',
      markerStyle: {
        initial: {
          fill: '#FF0000',
          stroke: '#4c0000'
        }
      }
    });
  },

  consumeMessages() {
    let didReceiveMessage = (msg) => {
      if (msg.author_location && msg.latitude && msg.longitude) {
        console.log(`Adding marker from cached location: ${msg.author_location}`);
        this.addMarker(msg.author_location, msg.latitude, msg.longitude, false)
      } else {
        let rndMsec = Math.floor(Math.random() * 2000) + 500;
        Em.run.later(() => {
          if (this.dataIndex % 3 == 0) {
            this.tryNominatim(msg.author_location);
          } else {
            this.tryGoogle(msg.author_location);
          }
        }, rndMsec);
      }
    }

    const consumer = this.get('cableService').createConsumer(this.socketURI);
    this.subscription = consumer.subscriptions.create("RadarChannel", {
      received: didReceiveMessage
    });
  },

  didInsertElement() {
    this._super(...arguments);
    this.consumeMessages();
    this.drawMap();
  }
});
