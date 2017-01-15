#Controlling Arduino Pins Through Websockets
*This is a very personalized project and you probably wont be able to get it to work. However if you are interested, please contact me*

The Arduino code that goes with this is here https://github.com/bjm904/ArduinoWebsockets
##SocketIOServer
This is the server that the Arduino talks to using socket.io. It uses 11 pins, more can be added but the C++ code will have to be modified. There is a test page in /html that talks directly to this as well. Clients are not meant to talk directly to this server as there is no rate limiting or securities whatsoever.

###Requires:
- express
- socket.io version 0.9 !important because this is the only version the Arduino will talk to





##treelightscontrol_node
This is the server that the client talks to. This server then relays the information to SocketIOServer. There is a Sparkade project called "treelightscontrol" that can be used to control this server. That project is not open source and is not hosted on Github. This server out of the box requires a running and valid Sparkade Master Server, however that can be fixed by removing all the code between `//BEGIN SERVER STUFF` and `//END SERVER STUFF`

###Requires:
- colors
- socket.io-client
- ws
