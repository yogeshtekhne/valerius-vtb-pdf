const customTransforms = {
  'test3': (obj, params) => {
    console.log(obj.src);
    console.log(obj.dst);
    console.log(params);
    return obj;
  },
  'getExtraFields': (obj, params) => {

    obj.dst.atoz = 'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ';

    if (!obj.dst.extraFieldValues) return obj;

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

    obj.dst.destinationH1 = obj.dst.destinationH2 = obj.dst.destinationH3 = obj.dst.destinationContent = '';
    obj.dst.segments.forEach((segment) => {
      if(segment.typeId == 19) {
        segment.elements.forEach((element) => {
          if(element.unitId == 17 && element.additionalText !== undefined) {
            if(element.additionalText.includes('</h1>') && element.additionalText.includes('</h2>') && element.additionalText.includes('</h3>')) {
              obj.dst.destinationH1 = element.additionalText.match(/<h1>(.*?)<\/h1>/)[1];
              obj.dst.destinationH2 = element.additionalText.match(/<h2>(.*?)<\/h2>/)[1];
              obj.dst.destinationH3 = element.additionalText.match(/<h3>(.*?)<\/h3>/)[1];
              //obj.dst.destinationContent = element.additionalText.match(/<\/h3>/)[1];
              obj.dst.destinationContent = element.additionalText.substring(element.additionalText.indexOf('</h3>') + 5, (element.additionalText.length));
            }
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

            contents.push(element.additionalText ? element.additionalText : '');

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
    let waypoints = [];
    let waypointsConfig = [];
    mapPoints.forEach((map) => {
      if(i == 0) {
        
        obj.dst.lat = mapPoints[i].latitude;
        obj.dst.lng = mapPoints[i].longitude;
        obj.dst.origin = { lat: mapPoints[i].latitude, lng: mapPoints[i].longitude };

      } else if (mapPoints.length -1 == i) {
        
        obj.dst.destination = { lat: mapPoints[i].latitude, lng: mapPoints[i].longitude };

      } else {
        
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
        icon: 'http://i.imgur.com/7teZKif.png',
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

    obj.dst.contactName = obj.dst.contactImage = obj.dst.contactEmail = obj.dst.contactText = obj.dst.contactIntro = obj.dst.contactFunction = '';

    if (!obj.dst.TSOrder.bookedByInfo) return obj;

    if(obj.dst.TSOrder.bookedByInfo.name || obj.dst.TSOrder.bookedByInfo.surname) {
      obj.dst.contactName = obj.dst.TSOrder.bookedByInfo.name + ' ' + obj.dst.TSOrder.bookedByInfo.surname;
    }
  
    if(obj.dst.TSOrder.bookedByInfo.signature) {

      let contactSignature = obj.dst.TSOrder.bookedByInfo.signature;
      
      //console.log('Hello WOrld', contactSignature.match(/<text>(.*?)<\/text>/));

      obj.dst.contactIntro = contactSignature.includes('<intro_text>')?contactSignature.match(/<intro_text>(.|\n)*?<\/intro_text>/)!==null?(contactSignature.match(/<intro_text>(.|\n)*?<\/intro_text>/)[0]).replace("<intro_text>", "").replace("</intro_text>", ""):'':'';
      obj.dst.contactFunction = contactSignature.includes('<function>')?contactSignature.match(/<function>(.|\n)*?<\/function>/)!==null?(contactSignature.match(/<function>(.|\n)*?<\/function>/)[0]).replace("<function>", "").replace("</function>", ""):'':'';
      obj.dst.contactImage = contactSignature.includes('<image>')?contactSignature.match(/<image>(.|\n)*?<\/image>/)!==null?(contactSignature.match(/<image>(.|\n)*?<\/image>/)[0]).replace("<image>", "").replace("</image>", ""):'':'';
      obj.dst.contactEmail = contactSignature.includes('<contact>')?contactSignature.match(/<contact>(.|\n)*?<\/contact>/)!==null?(contactSignature.match(/<contact>(.|\n)*?<\/contact>/)[0]).replace("<contact>", "").replace("</contact>", ""):'':'';
      obj.dst.contactText = contactSignature.includes('<text>')?contactSignature.match(/<text>(.|\n)*?<\/text>/)!==null?(contactSignature.match(/<text>(.|\n)*?<\/text>/)[0]).replace("<text>", "").replace("</text>", ""):'':'';
    
    }

    return obj;
  },
  'destinationImageFormatting': (obj, params) => {

    obj.dst.segments.forEach((segment) => {

      if(segment.typeId == 19) {

        segment.elements.forEach((element) => {

          if(element.unitId == 17) {

            element.media.forEach((image) => {
             
             image.url = image.url.replace('medium', 'large');

            });
          }
          
        });
      }
    
    });

    return obj;
  }
};

module.exports = customTransforms;
