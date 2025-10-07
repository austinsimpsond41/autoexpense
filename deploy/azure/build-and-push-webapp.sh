docker build --platform=linux/amd64 -t data41/autoexpense:latest .
docker tag data41/autoexpense:latest data41.azurecr.io/autoexpense:latest
docker push data41.azurecr.io/autoexpense:latest