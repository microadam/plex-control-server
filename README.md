## Build

```
docker build -t plex-control-server .
```

## RUN

```
docker run -d -p xxx:3000 -e PLEX_URL="http://xxxx:32400" -e API_KEY="xxxx" --restart=always --name plex-control-server plex-control-server
```