(function(vtb, undefined) {
  if(window.location.search != null && window.location.search !== ''){
    var config = {
      uuid: new Date().valueOf()
    };
    var key = decodeURIComponent(window.location.search.match(/(\?|&)key\=([^&]*)/)[2]);
    var pubnub = new PubNub({
      ssl: true,
      authKey: key,
      subscribeKey: 'sub-c-591ccb46-d3b5-11e8-ae2c-9246cc6b239c',
      publishKey: 'pub-c-1f2a7473-5944-44a0-9845-a8d3405e1a47'
    });

    pubnub.addListener({
      message: (msg) => {
        if(msg.message.uuid !== config.uuid){
          var event = new CustomEvent("vtbDataReceived", {
            detail: msg
          });
          window.vtb.dispatchEvent(event);
        };
      }
    });

    pubnub.subscribe({
      channels: [key],
      triggerEvents: ['message'],
      withPresence: true
    });

    // public
    window.vtb.addEventListener('vtbTextChanged', function(e) {
      e.detail.uuid = config.uuid;
      pubnub.publish({
        message: e.detail,
        channel: key
      });
    });
  }
}(window.vtb = window.vtb || document.createElement('vtb-messenger-listener-element')));
