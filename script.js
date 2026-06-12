const storageKey = 'kame_journal_critique_registry';
let records = JSON.parse(localStorage.getItem(storageKey)) || [];

// タブ切り替え用
const tabQuick = document.getElementById('tab-quick');
const tabDetail = document.getElementById('tab-detail');
const sectionQuick = document.getElementById('form-quick-section');
const sectionDetail = document.getElementById('form-detail-section');

// フォーム入力要素（ななめ読み）
const qTitle = document.getElementById('q-title');
const qSource = document.getElementById('q-source');
const qSummary = document.getElementById('q-summary');
const qLearning = document.getElementById('q-learning');
const saveQuickBtn = document.getElementById('save-quick-btn');

// フォーム入力要素（クリティーク）★大幅追加
const dTitle = document.getElementById('d-title');
const dSource = document.getElementById('d-source');
const dSummary = document.getElementById('d-summary');
const dComment = document.getElementById('d-comment');
const dLearning = document.getElementById('d-learning');
const saveDetailBtn = document.getElementById('save-detail-btn');

const checklistIds = [
    'c-intro-1', 'c-intro-2',
    'c-method-1', 'c-method-2', 'c-method-3',
    'c-result-1', 'c-result-2',
    'c-disc-1', 'c-disc-2'
];

const listContainer = document.getElementById('journal-list-container');
const toast = document.getElementById('toast');
const captureStage = document.getElementById('capture-stage');

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

/* ==================================================
   📁 タブ切り替え制御
   ================================================== */
tabQuick.addEventListener('click', () => {
    tabQuick.add('active'); tabDetail.remove('active');
    sectionQuick.add('active'); sectionDetail.remove('active');
});
// 補助クラス制御
tabQuick.onclick = function() {
    tabQuick.classList.add('active'); tabDetail.classList.remove('active');
    sectionQuick.classList.add('active'); sectionDetail.classList.remove('active');
};
tabDetail.onclick = function() {
    tabDetail.classList.add('active'); tabQuick.classList.remove('active');
    sectionDetail.classList.add('active'); sectionQuick.classList.remove('active');
};

/* ==================================================
   📸 画像生成パイプライン (セキュリティ回避＆自動改行反映仕様)
   ================================================== */
function setupCaptureStage(item) {
    const quickTemplate = document.getElementById('card-quick-template');
    const detailTemplate = document.getElementById('card-detail-template');
    quickTemplate.style.display = 'none';
    detailTemplate.style.display = 'none';

    let targetNode = null;

    if (item.type === 'quick') {
        document.getElementById('cap-q-title').textContent = item.title;
        document.getElementById('cap-q-source').textContent = item.source || '出典未記入';
        document.getElementById('cap-q-summary').textContent = item.summary;
        document.getElementById('cap-q-learning').textContent = item.learning;
        quickTemplate.style.display = 'block';
        targetNode = quickTemplate;
    } else {
        // クリティーク版の流し込み（★全要素対応）
        document.getElementById('cap-d-title').textContent = item.title;
        document.getElementById('cap-d-source').textContent = item.source || '出典未記入';
        document.getElementById('cap-d-summary-out').textContent = item.summary || '概要未記入';
        document.getElementById('cap-d-comment-out').textContent = item.comment || 'コメントなし';
        document.getElementById('cap-d-learning-out').textContent = item.learning || '学び未記入';

        const listOutput = document.getElementById('cap-d-checklist');
        listOutput.innerHTML = '';
        item.checklist.forEach(check => {
            const li = document.createElement('li');
            li.innerHTML = `${check.checked ? '☑' : '☒'} <strong>[${check.cat}]</strong> ${check.text}`;
            if(!check.checked) li.style.color = '#aa2222';
            listOutput.appendChild(li);
        });

        detailTemplate.style.display = 'block';
        targetNode = detailTemplate;
    }
    return targetNode;
}

function generateCanvasBlob(targetNode) {
    return html2canvas(targetNode, {
        backgroundColor: null,
        scale: 2,
        useCORS: true
    }).then(canvas => {
        return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    });
}

function openExternalMemo() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        window.location.href = "mobilenotes://";
    } else if (/Android/.test(userAgent)) {
        window.location.href = "https://keep.google.com/";
    } else {
        showToast('📸 学術画像カードを格納。Ctrl+Vで貼り付け可能です');
    }
}

async function executeCapturePipeline(item) {
    if (!navigator.clipboard || !window.ClipboardItem) {
        showToast('❌ お使いのブラウザは画像コピーに未対応です。');
        return;
    }

    const targetNode = setupCaptureStage(item);
    showToast('✨ 論文レジストリカードを作成中...');

    try {
        await navigator.clipboard.write([
            new window.ClipboardItem({
                "image/png": (async () => {
                    const blob = await generateCanvasBlob(targetNode);
                    if (!blob) throw new Error("Canvas render error");
                    return blob;
                })()
            })
        ]);

        showToast('📸 論文カードをコピーしました！メモ帳が開きます');
        setTimeout(openExternalMemo, 600);
    } catch (err) {
        console.error(err);
        showToast('❌ コピー失敗。GitHub Pages（HTTPS環境）で実行してください。');
    }
}

/* ==================================================
   💾 記録保存ロジック
   ================================================== */
// パターン1: ななめ読み保存
saveQuickBtn.addEventListener('click', () => {
    const titleVal = qTitle.value.trim();
    const sourceVal = qSource.value.trim();
    const summaryVal = qSummary.value.trim();
    const learningVal = qLearning.value.trim();

    if (!titleVal || !summaryVal) {
        showToast('⚠️ タイトルと概要は必須入力です');
        return;
    }

    const item = {
        id: Date.now(),
        type: 'quick',
        title: titleVal,
        source: sourceVal,
        summary: summaryVal,
        learning: learningVal
    };

    records.push(item);
    localStorage.setItem(storageKey, JSON.stringify(records));

    qTitle.value = ''; qSource.value = ''; qSummary.value = ''; qLearning.value = '';
    renderRecords();
    executeCapturePipeline(item);
});

// パターン2: しっかりクリティーク保存 (★機能拡張)
saveDetailBtn.addEventListener('click', () => {
    const titleVal = dTitle.value.trim();
    const sourceVal = dSource.value.trim();
    const summaryVal = dSummary.value.trim();
    const commentVal = dComment.value.trim();
    const learningVal = dLearning.value.trim();

    if (!titleVal) {
        showToast('⚠️ 論文タイトルを入力してください');
        return;
    }

    const checkedMatrix = checklistIds.map(id => {
        const el = document.getElementById(id);
        const parentLabel = el.parentElement.textContent.trim();
        let cat = "序論";
        if(id.includes("method")) cat = "方法";
        if(id.includes("result")) cat = "結果";
        if(id.includes("disc")) cat = "考察";

        return {
            cat: cat,
            text: parentLabel,
            checked: el.checked
        };
    });

    const item = {
        id: Date.now(),
        type: 'detail',
        title: titleVal,
        source: sourceVal,
        summary: summaryVal,
        checklist: checkedMatrix,
        comment: commentVal,
        learning: learningVal
    };

    records.push(item);
    localStorage.setItem(storageKey, JSON.stringify(records));

    // フォームクリア
    dTitle.value = ''; dSource.value = ''; dSummary.value = ''; dComment.value = ''; dLearning.value = '';
    checklistIds.forEach(id => document.getElementById(id).checked = false);
    
    renderRecords();
    executeCapturePipeline(item);
});

/* ==================================================
   🖥️ 履歴表示レンダリング
   ================================================== */
function renderRecords() {
    listContainer.innerHTML = '';
    if (records.length === 0) {
        listContainer.innerHTML = '<div class="empty-state font-sans">登録された論文レジストリはありません。</div>';
        return;
    }

    records.slice().reverse().forEach((item, index) => {
        const actualIndex = records.length - 1 - index;
        const card = document.createElement('div');
        card.className = 'journal-record-card';
        
        const isQuick = item.type === 'quick';
        const typeBadge = isQuick ? 
            '<span class="j-rec-type">ざっくりななめ読み</span>' : 
            '<span class="j-rec-type critique-type">しっかりクリティーク</span>';
        
        const metaInfo = `<div class="j-rec-meta">${escapeHtml(item.source || '出典未記入')}</div>`;

        card.innerHTML = `
            ${typeBadge}
            <div class="j-rec-title">${escapeHtml(item.title)}</div>
            ${metaInfo}
            <div class="card-actions">
                <button class="action-btn btn-copy" onclick="triggerManualRecordCapture(${actualIndex})">📸 再コピー</button>
                <button class="action-btn btn-delete" onclick="deleteRecord(${actualIndex})">削除</button>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

window.deleteRecord = function(index) {
    if (confirm('この論文レコードを削除しますか？')) {
        records.splice(index, 1);
        localStorage.setItem(storageKey, JSON.stringify(records));
        renderRecords();
        showToast('🗑️ レコードを削除しました');
    }
};

window.triggerManualRecordCapture = function(index) {
    const item = records[index];
    executeCapturePipeline(item);
};

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

renderRecords();
