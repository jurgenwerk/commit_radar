import Ember from 'ember';

export default Ember.Service.extend({
  nominatimUrl: "http://nominatim.openstreetmap.org/search",

  geocode(location, nominatimFirst=false) {
    return new Ember.RSVP.Promise((resolve, reject) => {
      if (nominatimFirst) {
        this.tryNominatim(location).then((locationData) => resolve(locationData));
      } else {
        this.tryGoogle(location).then((locationData) => resolve(locationData));
      }
    })
  },
  tryNominatim(location) {
    console.log(`Trying nominatim: ${location}`);
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
    console.log(`Trying google: ${location}`);
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
          console.log('google over limit, trying nominatim...');
          reject();
        } else {
          console.log('google geocode fail: ' + status);
          reject();
        }
      });
    });
  }
});
