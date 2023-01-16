
const { google } = require('googleapis');
const authorize = require('./authGoogle');

//configure FolderSource,FolderDestination
//No poner un archivo y una carpeta con el mismo nombre

const FolderSource = "1CEMA4MSfcjjC78cJ_GM_k2d1LHsuC0mq";
const FolderDestination = "1-lEdgmTx7D0BOyyMD_bQ2KVNmJ6FqF4c";

async function main(){

    //get token google drive
    const auth = await authorize();
    const service = google.drive({version: 'v3', auth});

    //get all the folders
    const listSourceFolder = await service.files.list({
        q:`'${FolderSource}' in parents and trashed = false`,
        pageSize:1000,
        fields: 'nextPageToken, files(id, name, mimeType )'
    });
    
    const listDestinationFolder = await service.files.list({
        q:`'${FolderDestination}' in parents and trashed = false`,
        pageSize:1000,
        fields: 'nextPageToken, files(id, name, mimeType )'
    });

    let isFolder = false;
    let destinationFolder = null;
    let existsFile = null;
    for(const folder of listSourceFolder.data.files){
        
        isFolder = folder.mimeType == "application/vnd.google-apps.folder";
        if(isFolder){

            destinationFolder =  listDestinationFolder.data.files.find( element => element.name == folder.name)
            const existsFolderinDestination = (destinationFolder && destinationFolder.mimeType == "application/vnd.google-apps.folder");
            const sourceFiles = await getFilesForSpecificFolder(service,folder.id);
            if(existsFolderinDestination){

                //iterate both folder and check that the files exist
                const destinationFiles = await getFilesForSpecificFolder(service,destinationFolder.id);
                console.log(destinationFiles);
                for(const file of sourceFiles){

                    existsFile = destinationFiles.find(element => element.name == file.name);
                    if(!existsFile)
                        exportFile(service,file,destinationFolder.id);

                }


            }else{
                //create folder and export files
                const folderCreated = await createFolder(service,folder.name);
                for(const file of sourceFiles){
                    exportFile(service,file,folderCreated.folder_id);
                }
            }
        }

    }

    console.log("Migration successfull");

}

async function getFilesForSpecificFolder(service,folderId){

    try{

        const response = await service.files.list({
            q:`'${folderId}' in parents and trashed = false`,
            fields: 'nextPageToken, files(id, name, mimeType )',
            pageSize:1000,
            supportsAllDrives:true
        });

        return response.data.files;

    }catch(error){
        console.log("error in the moment to get files for specific folder");
        return [];
    }
    
}

async function exportFile(service,file,destinationFolder){


    const request = {
        name: file.name,  //name file
        parents: [destinationFolder]  //destination folder
    }



    try{

        const result = service.files.copy({
            fileId: file.id, //id file to copy
            requestBody: request,
            supportsAllDrives:true
        })

        return {
            ...result,
            error:false
        }

    }catch(err){
        console.log("error to copy the file");
        return {
             error:true
        }
    }

}

async function createFolder(service,name){


    const fileMetadata = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [FolderDestination]
    };

  
    try {

        const file = await service.files.create({
            resource: fileMetadata,
            supportsAllDrives:true,
            fields: 'id',
        });
        
        return {
            message:"folder created",
            folder_id: file.data.id,
            error:false
        };

    } catch (err) {
        return {"error":true}
    }

}

main();
