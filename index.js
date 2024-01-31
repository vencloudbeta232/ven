const previousBtn = document.getElementById('previous-btn');
const tableBody = document.getElementById('tbody');
const createFolderBtn = document.getElementById('create-btn');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const trashBtn = document.getElementById('trash-btn');
const renameBtn = document.getElementById('rename-btn');
const clipboardBtn = document.getElementById('clipboard-btn');

const apiUrl = 'http://127.0.0.1:5000';

let selectedDirectoryRow = null;
let selectedDirectoryItem = null;
let currentDirectoryId = 1;


function prepareTableRow(data, isFolder) {
    const tr = document.createElement('tr');

    tr.innerHTML = `
        <div title="${data.name}" style="display: flex; align-items: center;">
            ${isFolder ? getFolderIcon() : getFileIcon()}
            <div class="${isFolder ? 'folder' : 'file'}" id="${data.id}" style="margin-left: 5px;">
                ${data.name}
            </div>
        </div>`;
    return tr;
}

function processRootDirectory(directory) {
    return {
        id: directory.id,
        name: directory.name,
        size: directory.size !== undefined ? directory.size : '-',
        createdDate: directory.created_date,
        type: directory.type,
    };
}

function processInnerDirectoriesAndFiles(item) {
    return {
        id: item.id,
        name: item.name,
        size: item.size,
        createdDate: item.created_date,
        type: item.type,
    };
}


function getSelected() {
    if (selectedDirectoryItem) {
        const itemId = selectedDirectoryItem.id;
        const itemType = selectedDirectoryItem.type;
        console.log(itemId)
        return {
            id: itemId,
            type: itemType,
        };
    }
    return null;
}


function uniqueId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

function resetBtns() {
    createFolderBtn.disabled = false;
    uploadBtn.disabled = false;
    const selected = getSelected();
    trashBtn.disabled = !selected;
    renameBtn.disabled = !selected;
    clipboardBtn.disabled = !(selected && selected.type === 'file');
}

function disableAllBtns() {
    previousBtn.disabled = true;
    createFolderBtn.disabled = true;
    uploadBtn.disabled = true;
    trashBtn.disabled = true;
    renameBtn.disabled = true;
    clipboardBtn.disabled = true;
}


async function fetchCurrentDirectory() {
    const currentDirectoryUrl = `${apiUrl}/directories/${currentDirectoryId}`;

    try {
        const response = await fetch(currentDirectoryUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        if (data && data.files_and_directories) {
            const processedData = data.files_and_directories.map(item => processInnerDirectoriesAndFiles(item));
            generateTableRows(processedData);
        } else {
            console.error('Error: Unexpected API response format');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

function generateTableRows(data) {
    tableBody.innerHTML = ''; // Clear existing rows

    data.forEach(item => {
        const isFolder = item.type === 'directory';
        const row = tableBody.insertRow();

        row.insertCell(0).appendChild(prepareTableRow(item, isFolder));
        row.insertCell(1).textContent = isFolder ? '-' : humanReadableSize(item.size);
        row.insertCell(2).textContent = new Date(item.createdDate).toLocaleString();

        row.addEventListener('dblclick', () => handleRowDoubleClick(item));
        row.addEventListener('click', () => handleRowClick(row, item));
    });
}


createFolderBtn.addEventListener('click', () => {
    // Create a new row
    const row = tableBody.insertRow();

    // Create an input element for the folder name
    const folderInput = document.createElement('input');
    folderInput.type = 'text';
    folderInput.style.height = '1rem';
    folderInput.style.width = '80%';
    folderInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            // When Enter is pressed, create the folder
            const folderName = folderInput.value.trim();
            if (folderName) {
                createFolder(folderName, currentDirectoryId, () => {
                    // Callback to refresh the current directory on successful creation
                    fetchCurrentDirectory();
                });
            } else {
                // Handle empty folder name or other validation if needed
                console.error('Error: Folder name cannot be empty');
            }}
    });
    // Create a new row with the input and other cells
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td style="border-right: none">
            <svg style="vertical-align: middle" xmlns="http://www.w3.org/2000/svg" width="18"
                 height="18" fill="currentColor"
                 class="bi bi-folder" viewBox="0 0 18 18">
                <path d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31zM2.19 4a1 1 0 0 0-.996 1.09l.637 7a1 1 0 0 0 .995.91h10.348a1 1 0 0 0 .995-.91l.637-7A1 1 0 0 0 13.81 4H2.19zm4.69-1.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139C1.72 3.042 1.95 3 2.19 3h5.396l-.707-.707z"
                      ></path>
            </svg>
            <div class="folder"></div>
        </td>
        <td style="border-left: none;border-right: none"> - </td>
        <td style="border-left: none">${new Date().toLocaleString()}</td>`;

    // Append the input element to the anchor tag in the new row
    tr.querySelector('.folder').appendChild(folderInput);
    tableBody.appendChild(tr);
    folderInput.focus();
});

// Function to create a folder using the /directories API
async function createFolder(folderName, parentDirectoryId, onSuccess) {
    const createFolderUrl = `${apiUrl}/directories`;

    try {
        const response = await fetch(createFolderUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: folderName,
                parent_directory_id: parentDirectoryId,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Optionally, you can update the UI or perform other actions on successful folder creation
        console.log(`Folder "${folderName}" created successfully`);

        // Execute the onSuccess callback
        if (onSuccess && typeof onSuccess === 'function') {
            onSuccess();
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}



previousBtn.addEventListener('click', async () => {
    if (currentDirectoryId !== 1) {
        const parentDirectoryId = await getParentDirectoryId(currentDirectoryId);

        if (parentDirectoryId !== null) {
            const parentDirectoryUrl = `${apiUrl}/directories/${parentDirectoryId}`;

            try {
                const response = await fetch(parentDirectoryUrl);

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();

                if (data && data.files_and_directories) {
                    const processedData = data.files_and_directories.map(item => processInnerDirectoriesAndFiles(item));
                    generateTableRows(processedData);

                    // Update currentDirectoryId to the parent directory
                    currentDirectoryId = parentDirectoryId;
                } else {
                    console.error('Error: Unexpected API response format');
                }
            } catch (error) {
                console.error('Error:', error.message);
            }
        } else {
            console.error('Error: Unable to determine parent directory');
        }
    }
});

async function getParentDirectoryId(directoryId) {
    const parentDirectoryUrl = `${apiUrl}/directories/${directoryId}/parent`;

    try {
        const response = await fetch(parentDirectoryUrl);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (data && data.parent_directory_id !== undefined) {
            return data.parent_directory_id;
        } else {
            console.error('Error: Unexpected API response format for parent directory ID');
            return null;
        }
    } catch (error) {
        console.error('Error:', error.message);
        return null;
    }
}

// Modify handleRowDoubleClick to update the currentDirectoryId
async function handleRowDoubleClick(item) {
    if (item.type === 'directory') {
        const clickedDirectoryId = item.id;
        const clickedDirectoryUrl = `${apiUrl}/directories/${clickedDirectoryId}`;

        try {
            const response = await fetch(clickedDirectoryUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            if (data && data.files_and_directories) {
                const processedData = data.files_and_directories.map(item => processInnerDirectoriesAndFiles(item));
                generateTableRows(processedData);

                // Update currentDirectoryId to the clicked directory
                currentDirectoryId = clickedDirectoryId;
            } else {
                console.error('Error: Unexpected API response format');
            }
        } catch (error) {
            console.error('Error:', error.message);
        }
    } else if (item.type === 'file') {
        const fileDownloadUrl = `${apiUrl}/files/${item.id}/download`;
        window.location.href = fileDownloadUrl;
    }
}


function handleRowClick(row, item) {
    if (selectedDirectoryRow) {
        selectedDirectoryRow.classList.remove('selected');
    }
    row.classList.add('selected');
    selectedDirectoryRow = row;
    selectedDirectoryItem = item
    console.log('Selected Item:', item);
}


uploadBtn.addEventListener('click', () => {
    // Trigger the file input click
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', async (event) => {
    const files = event.target.files;

    if (files.length > 0) {
        const maxSizeInBytes = 25 * 1024 * 1024; // 25MB

        // Check if all selected files are within the size limit
        const isSizeValid = Array.from(files).every(file => file.size <= maxSizeInBytes);

        if (!isSizeValid) {
            console.error('Error: File size exceeds the limit (25MB).');
            // Optionally, inform the user about the size limit
            return;
        }

        // Continue with file upload for each file
        Array.from(files).forEach(file => {
            const id = uniqueId(); // Generate a unique ID for each progress bar
            createProgressBar(id, file.name);

            const formData = new FormData();
            formData.append('file', file);
            formData.append('directory_id', currentDirectoryId);

            const xhr = new XMLHttpRequest();
            xhr.open("POST", `${apiUrl}/files/upload`, true);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const progress = (e.loaded / e.total) * 100;
                    updateProgressBar(id, Math.floor(progress));
                }
            };

            // Non-200 status handler
            xhr.onload = async () => {
                deleteProgressBar(id);
                await fetchCurrentDirectory();
            };

            // Network error handler
            xhr.onerror = async () => {
                deleteProgressBar(id);
                await fetchCurrentDirectory();
            };

            // Finally send data
            xhr.send(formData);
        });
    }
});


trashBtn.addEventListener('click', async () => {
    const selected = getSelected();

    if (selected && selected.type === 'file') {
        const fileId = selected.id;

        try {
            const response = await fetch(`${apiUrl}/files/${fileId}/delete`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            selectedDirectoryRow.remove();
            resetBtns();
        } catch (error) {
            console.error('Error:', error.message);
        }
    }
    else if (selected && selected.type === 'directory') {
        const directoryId = selected.id;

        try {
            const response = await fetch(`${apiUrl}/directories/${directoryId}/delete`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            selectedDirectoryRow.remove(); // Assuming selectedDirectoryRow is the row
            resetBtns();
        } catch (error) {
            console.error('Error:', error.message);
        }
    }
});

// Make a GET request using the Fetch API to fetch the root directory
fetch(`${apiUrl}/directories/root`)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        const filesAndDirectories = data.files_and_directories || [];
        const processedData = filesAndDirectories.map(item => processRootDirectory(item));
        generateTableRows(processedData);
    })
    .catch(error => {
        console.error('Error:', error.message);
});