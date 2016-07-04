import Ember from 'ember';

export default Ember.Service.extend({
  nominatimUrl: "http://nominatim.openstreetmap.org/search",

  geocode(location, nominatimFirst=false) {
    return new Ember.RSVP.Promise((resolve, reject) => {
      if (nominatimFirst) {
        const nominatimPromise = this.tryNominatim(location)
        nominatimPromise.then((locationData) => resolve(locationData));
        nominatimPromise.catch(() => {
          const googlePromise = this.tryGoogle(location);
          googlePromise.then((locationData) => resolve(locationData));
          googlePromise.catch(() => reject());
        })
      } else {
        const googlePromise = this.tryGoogle(location)
        googlePromise.then((locationData) => resolve(locationData));
        googlePromise.catch(() => {
          const nominatimPromise = this.tryNominatim(location);
          nominatimPromise.then((locationData) => resolve(locationData));
          nominatimPromise.catch(() => reject());
        })
      }
    })
  },
  tryNominatim(location) {
    Ember.Logger.info(`Trying nominatim: ${location}`);
    return new Ember.RSVP.Promise((resolve, reject) => {
      let locationParam = location.replace(/\s+/g, " ").trim().split(" ").join("+");
      Ember.$.getJSON(this.get('nominatimUrl') + `?format=json&q=${locationParam}`).then((data) => {
        if (data[0] && data[0].lat && data[0].lon) {
          resolve({location: location, latitude: data[0].lat, longitude: data[0].lon})
        } else {
          reject();
        }
      });
    })
  },
  tryGoogle(location) {
    Ember.Logger.info(`Trying google: ${location}`);
    let geocoder = new google.maps.Geocoder();
    return new Ember.RSVP.Promise((resolve, reject) => {
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

          resolve({location: location, latitude: latitude, longitude: longitude});
        }
        else if (status == google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
          Ember.Logger.info('google over limit');
          reject();
        } else {
          Ember.Logger.info('google geocode fail: ' + status);
          reject();
        }
      });
    });
  }
});
