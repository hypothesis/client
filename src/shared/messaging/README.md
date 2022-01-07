# shared/messaging

Code for setting up communication channels between different frames and making
RPC calls over them. Inter-frame communication is based on the [Channel
Messaging API](https://developer.mozilla.org/en-US/docs/Web/API/Channel_Messaging_API).

`PortProvider` and `PortFinder` are used to create channels for frames to
communicate. See `PortProvider` for a detailed overview of the discovery
process.

Once a message channel has been set up between two frames, `PortRPC` is used
to make RPC requests over that channel.
