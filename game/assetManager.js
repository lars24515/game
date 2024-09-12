const fs = require('fs');
const path = require('path');

class AssetManager extends Phaser.Scene {
    constructor(transformScale=64) {
        // this.grassTextures = this.getAssets("assets/what u want");
    }

    getAssets(dir, transform=true, list=false, customScale=null){
        let newMap = {};
        let newList = [];

        fs.readdir(dir, (err, files) => {
            if (err) {
                return console.error(err);
            }

            files.forEach(fileName => {
                if (fileName.endsWith(".png")){
                    const filePath = path.join(dir, fileName);

                    // load image for phaser
                    loadedImage = this.load.image(fileName, filePath);

                    if (transform){
                        // sclae image accordingly
                        if (!customScale){
                            loadedImage.setDisplaySize(transformScale, transformScale);
                        } else {
                            loadedImage.setDisplaySize(customScale, customScale);
                        }
                    }

                    if (!list){
                        newMap[fileName] = loadedImage;
                    } else {
                        newList.push(loadedImage);
                    }

                } else if (fileName.endsWith(".mp3")){
                    // handle this in the future
                }

                if (!list){
                    return newMap;
                } else {
                    return newList;
                }
            })

        })
    }

}

export default AssetManager; // Export the class
