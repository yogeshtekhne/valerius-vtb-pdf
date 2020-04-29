const customTransforms = {
  'test3': (obj, params) => {
    console.log(obj.src);
    console.log(obj.dst);
    console.log(params);
    return obj;
  },
  'getExtraFields': (obj, params) => {

    obj.dst.atoz = 'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ';

    if (!obj.dst.extraFieldValues) return;

    obj.dst.youtubeUrl = obj.dst.button_readmore = obj.dst.button_itinerary = titel_itinerary = '';
    obj.dst.titel_overview = obj.dst.include_trip_text = obj.dst.titel_information = obj.dst.titel_contact = '';
    obj.dst.button_discover = obj.dst.show_price_vtb = '';
    obj.dst.extraFieldValues.forEach((extraField) => {

      extraField.fields.forEach((field) => {

        switch(field.name) {
          case 'youtube_url': obj.dst.youtubeUrl = field.value;
            break;
          case 'button_readmore': obj.dst.button_readmore = field.value;
            break;
          case 'button_itinerary': obj.dst.button_itinerary = field.value;
            break;
          case 'titel_itinerary': obj.dst.titel_itinerary = field.value;
            break;
          case 'titel_overview': obj.dst.titel_overview = field.value;
            break;
          case 'include_trip_text': obj.dst.include_trip_text = field.value;
            break;
          case 'titel_information': obj.dst.titel_information = field.value;
            break;
          case 'titel_contact': obj.dst.titel_contact = field.value;
            break;
          case 'button_discover': obj.dst.button_discover = field.value;
            break;
          case 'show_price_vtb': obj.dst.show_price_vtb = field.value;
            break;
        }
        
      });
    });

    return obj;
  }, 
  'removeolPrices': (obj, params) => {

    obj.dst.segments.forEach((segment) => {

      segment.elements.forEach((element) => {
        delete element.olPrices;
      });

    });

    return obj;
  },
  'parseDestinationContent':(obj, params) => {

    obj.dst.segments.forEach((segment) => {
      if(segment.typeId == 19) {
        segment.elements.forEach((element) => {
          if(element.unitId == 17) {

            obj.dst.destinationH1 = element.additionalText.match(/<h1>(.*?)<\/h1>/)[1];
            obj.dst.destinationH2 = element.additionalText.match(/<h2>(.*?)<\/h2>/)[1];
            obj.dst.destinationH3 = element.additionalText.match(/<h3>(.*?)<\/h3>/)[1];
            obj.dst.destinationContent = element.additionalText.match(/<\/h3>(.*?)<\/body>/)[1];

          }
        });
      }
    });
    return obj;
  },
  'parsePracticalInformation':(obj, params) => {

    contents = [];
    obj.dst.segments.forEach((segment) => {
      if(segment.typeId == 20) {
        segment.elements.forEach((element) => {
          if (element.unitId == 17) {

            // console.log('=>', element.additionalText.replace(/<\/?[^>]+(>|$)/g, ""));
            // informationH2 = element.additionalText.match(/<h2>(.*?)<\/h2>/g);
            // console.log('informationH2', informationH2);
            // content = element.additionalText.match(/<\/h2>(.*?)<h2>/g);
            // content = element.additionalText.match(/<\/h3>(.*?)<\/body>/g);

            contents.push(element.additionalText);

          }
        });
      }
    });
    obj.dst.contents = contents;
    return obj;
  },
  // 'getMapPoints': (obj, params) => {

  //   let markers = [];
  //   obj.dst.segments.forEach((segment) => {

  //     segment.elements.forEach((element) => {
  //       if (element.maps) {
  //         if (element.maps.latitude) {
  //           markers.push(element.maps)
  //         }
  //       }
  //     });
  //   });
  //   obj.dst.markers = markers;
  //   return obj;
  // },
  'getdailyItinerary': (obj, params) => {

    let dailyItinerary = [];
    obj.dst.segments.forEach((segment) => {
      if(segment.typeId == 1) {
        dailyItinerary.push(segment);
      }
    });
    
    obj.dst.dailyItinerary = dailyItinerary;
    return obj;
  },
  'addIconChar': (obj, params) => {

    let atoz = 'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let i = -1; 
    let prevIsDeafult = false;
    let mapPoints = [];
    obj.dst.segments.forEach((segment) => {


      if(segment.typeId == 1) {
      
        if(prevIsDeafult == false) {
          i++;
          mapPoints.push(segment.maps);
        }
        segment.iconChar = atoz[i];
        prevIsDeafult = true;
        //
      } else {
        prevIsDeafult = false;
      }
      
    });
   
    i = 0;
    let waypoints = waypointsConfig = [];
    mapPoints.forEach((map) => {
      if(i == 0) {
        
        obj.dst.lat = mapPoints[i].latitude;
        obj.dst.lng = mapPoints[i].longitude;
        obj.dst.origin = { lat: mapPoints[i].latitude, lng: mapPoints[i].longitude };

      } else if (mapPoints.length -1 == i) {
        
        waypoints.push({
          location: { lat: mapPoints[i].latitude, lng: mapPoints[i].longitude },
          stopover: false,
        });

        waypointsConfig.push({
          infoWindow: `<h4>A<h4>
            <a href='http://google.com' target='_blank'>A</a>
            `,
          icon: 'http://i.imgur.com/7teZKif.png',
        });
        
      } else {
        
        obj.dst.destination = { lat: mapPoints[i].latitude, lng: mapPoints[i].longitude };
      }
      i++;
    });

    obj.dst.renderOptions = {
      suppressMarkers: true,
    };

    
    
    obj.dst.waypoints = waypoints;
    
    obj.dst.markerOptions = {
      origin: {
        infoWindow: 'Origin.',
        icon: 'http://media.wwtg.nl/original/original/map-pin-nieuw.png',
      },
      waypoints: waypointsConfig,
      destination: {
        infoWindow: 'Destination',
        icon: 'http://i.imgur.com/7teZKif.png',
      },
    };

    obj.dst.mapPoints = mapPoints;
    return obj;

  },
  'coverImage':(obj, params) => {

    let i = 0;
    obj.dst.cover.forEach((c) => {
      
      obj.dst.cover[i].url = c.url.replace('medium', 'large');

      i++;
    });

    return obj;
  },
  'getBookedBy':(obj, params) => {

    obj.dst.contactName = obj.dst.contactImage = obj.dst.contactEmail = obj.dst.contactText = '';

    if (!obj.dst.TSOrder.bookedByInfo) return;

    let contactSignature = obj.dst.TSOrder.bookedByInfo.signature;

    obj.dst.contactName = obj.dst.TSOrder.bookedByInfo.name + ' ' + obj.dst.TSOrder.bookedByInfo.surname;
    obj.dst.contactImage = contactSignature.match(/<image>(.*?)<\/image>/)[1];
    obj.dst.contactEmail = contactSignature.match(/<contact>(.*?)<\/contact>/)[1];
    obj.dst.contactText = contactSignature.match(/<text>(.*?)<\/text>/)[1];

    return obj;
  },
};

module.exports = customTransforms;
