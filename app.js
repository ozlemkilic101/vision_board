const canvas = document.getElementById("canvas");
const uploadInput = document.getElementById("uploadInput");
const exportBtn = document.getElementById("exportBtn");
const clearBtn = document.getElementById("clearBtn");
const loading = document.getElementById("loading");

let zIndexCounter = 10;

// --- Kırpma İçin Değişkenler ---
let cropper;
let currentTargetImg;
const cropModal = document.getElementById("cropModal");
const cropImage = document.getElementById("cropImage");
const saveCropBtn = document.getElementById("saveCropBtn");
const cancelCropBtn = document.getElementById("cancelCropBtn");

// 1. Hazır Görseller
document.querySelectorAll(".preset-img").forEach(img => {
    img.addEventListener("click", () => createVisionItem(img.src));
});

// 2. Bilgisayardan Çoklu Yükleme
uploadInput.onchange = e => {
    const files = [...e.target.files];
    if (files.length === 0) return;

    loading.style.display = "flex";
    
    // Tüm dosyaları oku ve yerleştir
    let loadedCount = 0;
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
            createVisionItem(reader.result);
            loadedCount++;
            if (loadedCount === files.length) {
                loading.style.display = "none";
            }
        };
        reader.readAsDataURL(file);
    });
};

function createVisionItem(src) {
    const placeholder = canvas.querySelector('.canvas-placeholder');
    if (placeholder) placeholder.remove();

    const wrapper = document.createElement("div");
    wrapper.className = "vision-item"; 
    
    const canvasRect = canvas.getBoundingClientRect();
    const randomWidth = Math.floor(Math.random() * (300 - 180 + 1)) + 180;
    const randomX = Math.random() * (canvasRect.width - randomWidth);
    const randomY = Math.random() * (canvasRect.height - 250);
    const randomRotation = Math.floor(Math.random() * 20) - 10;

    wrapper.style.width = `${randomWidth}px`;
    wrapper.style.zIndex = ++zIndexCounter;
    wrapper.dataset.x = randomX;
    wrapper.dataset.y = randomY;
    wrapper.dataset.angle = randomRotation;

    // --- SİLME BUTONU ---
    const deleteBtn = document.createElement("div");
    deleteBtn.className = "delete-btn";
    deleteBtn.innerHTML = "×";
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        wrapper.remove();
    };

    // --- KIRPMA BUTONU ---
    const cropBtn = document.createElement("div");
    cropBtn.className = "crop-btn";
    cropBtn.innerHTML = "✂"; // Makas simgesi
    cropBtn.onclick = (e) => {
        e.stopPropagation();
        startCropping(img);
    };

    const img = document.createElement("img");
    img.src = src;

    const rotateHandle = document.createElement("div");
    rotateHandle.className = "rotate-handle";

    wrapper.appendChild(deleteBtn);
    wrapper.appendChild(cropBtn); // Kırpma butonunu ekledik
    wrapper.appendChild(rotateHandle);
    wrapper.appendChild(img);
    canvas.appendChild(wrapper);

    updateTransform(wrapper);
    setupInteractions(wrapper);
    
    deselectAll();
    wrapper.classList.add('active');
}

// 4. Etkileşimler (Sürükleme, Büyütme, Döndürme)
function setupInteractions(el) {
    el.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        deselectAll();
        el.classList.add('active');
        el.style.zIndex = ++zIndexCounter;
    });

    interact(el)
        .draggable({
            listeners: {
                move(event) {
                    const target = event.target;
                    const x = (parseFloat(target.dataset.x) || 0) + event.dx;
                    const y = (parseFloat(target.dataset.y) || 0) + event.dy;

                    target.dataset.x = x;
                    target.dataset.y = y;
                    updateTransform(target);
                }
            }
        })
        .resizable({
            edges: { right: true, bottom: true, left: true, top: true },
            listeners: {
                move(event) {
                    let target = event.target;
                    let x = parseFloat(target.dataset.x) || 0;
                    let y = parseFloat(target.dataset.y) || 0;

                    target.style.width = event.rect.width + 'px';
                    target.style.height = event.rect.height + 'px';

                    x += event.deltaRect.left;
                    y += event.deltaRect.top;

                    target.dataset.x = x;
                    target.dataset.y = y;
                    updateTransform(target);
                }
            }
        });

    const rotateHandle = el.querySelector('.rotate-handle');
    interact(rotateHandle).on('move', event => {
        const rect = el.getBoundingClientRect();
        const center = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
        const angle = Math.atan2(event.clientY - center.y, event.clientX - center.x);
        el.dataset.angle = angle * (180 / Math.PI) + 90;
        updateTransform(el);
    });
}

function updateTransform(el) {
    const x = el.dataset.x || 0;
    const y = el.dataset.y || 0;
    const angle = el.dataset.angle || 0;
    el.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
}

function deselectAll() {
    document.querySelectorAll('.vision-item').forEach(item => item.classList.remove('active'));
}

canvas.addEventListener('mousedown', () => deselectAll());

// EXPORT
exportBtn.onclick = () => {
    deselectAll();
    const btnText = exportBtn.innerText;
    exportBtn.innerText = "İşleniyor...";
    
    html2canvas(canvas, { 
        useCORS: true,
        scale: 2,
        backgroundColor: "#ffffff" 
    }).then(cvs => {
        const link = document.createElement("a");
        link.download = "vision-board.png";
        link.href = cvs.toDataURL("image/png");
        link.click();
        exportBtn.innerText = btnText;
    });
};

clearBtn.onclick = () => {
    if(confirm("Tüm panoyu temizlemek istediğine emin misin?")) {
        // Sadece vision-item'ları sil, filigranı ve canvas yapısını koru
        const items = canvas.querySelectorAll('.vision-item');
        items.forEach(item => item.remove());
        
        // Placeholder'ı geri ekle (eğer yoksa)
        if (!canvas.querySelector('.canvas-placeholder')) {
            const placeholder = document.createElement('div');
            placeholder.className = 'canvas-placeholder';
            placeholder.innerText = 'Görselleri buraya tıklayarak ekle veya sürükle';
            canvas.appendChild(placeholder);
        }
    }
};

const shareBtn = document.getElementById("shareBtn");

shareBtn.onclick = async () => {
    deselectAll();
    loading.style.display = "flex";

    try {
        const cvs = await html2canvas(canvas, { useCORS: true, scale: 2 });
        const blob = await new Promise(resolve => cvs.toBlob(resolve, 'image/png'));
        const file = new File([blob], "my-vision-board.png", { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: 'Benim Vision Boardum',
                text: 'Geleceğimi tasarladım! Sende denemek ister misin?',
            });
        } else {
            alert("Paylaşım özelliği bu tarayıcıda kısıtlı. Önce 'Görüntüyü İndir' yapıp sonra manuel paylaşabilirsin! ✨");
            exportBtn.click();
        }
    } catch (err) {
        console.error("Paylaşım hatası:", err);
    } finally {
        loading.style.display = "none";
    }
};

// --- KIRPMA MANTIĞI FONKSİYONLARI ---

function startCropping(imgElement) {
    currentTargetImg = imgElement;
    cropImage.src = imgElement.src;
    cropModal.style.display = 'flex';

    if (cropper) {
        cropper.destroy();
    }

    cropper = new Cropper(cropImage, {
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.8,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
    });
}

saveCropBtn.onclick = () => {
    const croppedCanvas = cropper.getCroppedCanvas();
    currentTargetImg.src = croppedCanvas.toDataURL();
    closeCropModal();
};

cancelCropBtn.onclick = () => {
    closeCropModal();
};

function closeCropModal() {
    cropModal.style.display = 'none';
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}