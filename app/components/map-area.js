import Ember from 'ember';

export default Ember.Component.extend({

  drawMap: function() {
    this.$('#map_area').vectorMap({
      map: 'world_mill'
    });
  }.on('didInsertElement')
});
