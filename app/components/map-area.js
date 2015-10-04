import Ember from 'ember';

export default Ember.Component.extend({

  places: ['Paris, France',
        'Xiamen, Fujian ',
        'Paris, France ',
        'Italy ',
        'Ohio ',
        'Paris, France ',
        'anaheim california ',
        'United Kingdom ',
        'Philadelphia, PA ',
        'Houston, Texas ',
        'Brooklyn ',
        'India ',
        'Rhode Island ',
        'Buea, Cameroon ',
        'Rhode Island ',
        'Bucharest ',
        'Eindhoven, The Netherlands ',
        '珠海 ',
        'São Vicente - SP ',
        'Italy ',
        'United Kingdom ',
        'San Diego ',
        'Oxford ',
        'Montreal, QC, Canada ',
        'Taipei, Taiwan ',
        'Germany ',
        'Italy ',
        'Mumbai, India. ',
        'Buea, Cameroon ',
        'France ',
        'San Francisco, CA ',
        'Lille, France ',
        'Manchester, United Kingdom ',
        'Luxembourg ',
        'San Francisco, CA ',
        'United Kingdom ',
        'Manchester, United Kingdom ',
        'Rennes, France ',
        'Grenoble, France ',
        'Hong Kong',
        'Warsaw',
        'Helsinki, Finland'],

  dataIndex: 0,

  placeMarker: function () {
    let mapObject = $('#map_area').vectorMap('get', 'mapObject');
    let geocoder = new google.maps.Geocoder();
    let index = this.dataIndex++;
    let place = this.places[index];
    this.set('place', place)
    geocoder.geocode({'address': place}, function(results, status) {
      if (status === google.maps.GeocoderStatus.OK) {
        let coords = results[0].geometry.location;
        console.log(results[0].geometry.location);
        mapObject.addMarker(index, {latLng: [coords.H, coords.L]});
      } else {
        console.log('geocode fail: ' + status);
      }
    });
  },

  drawMap: function() {
    this.$('#map_area').vectorMap({
      map: 'world_mill'
    });

    setInterval(() => {
      this.placeMarker()
    }, 2000);
  }.on('didInsertElement')
});
