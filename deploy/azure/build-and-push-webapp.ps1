param(
    [String]$ImageTag = "latest"
)
# Write-Output $NEXT_PUBLIC_WS_URL

Write-Output "Building autoexpense Image with Tag: $ImageTag"

docker build --platform=linux/amd64 -t data41/autoexpense:$ImageTag .
docker tag data41/autoexpense:$ImageTag data41.azurecr.io/autoexpense:$ImageTag
docker push data41.azurecr.io/autoexpense:$ImageTag