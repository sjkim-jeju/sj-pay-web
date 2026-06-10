const AI_SERVER_URL = 'https://sj-pay.onrender.com/api/analyze'; 
const API_URL = 'https://sj-pay.onrender.com/api/transactions';
let transactions = [];
let currentTab = 'all';

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('dateInput').value = new Date().toISOString().split('T')[0];
    
    // 🌟 서버(DB)에서 내역 싹 다 불러오기! 🌟
    fetchTransactions();

    // 탭 클릭 필터링
    const tabBtns = document.querySelectorAll('.tab-btn');
    const summaryTitle = document.getElementById('summaryTitle');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentTab = e.currentTarget.getAttribute('data-tab');
            tabBtns.forEach(b => b.className = "tab-btn px-4 py-2 rounded-full text-gray-500 hover:bg-rose-50 transition");
            e.currentTarget.className = "tab-btn px-4 py-2 rounded-full bg-rose-100 text-rose-700 font-bold transition";
            summaryTitle.textContent = `${e.currentTarget.textContent} 현황 🐾`;
            renderDashboard();
        });
    });

    // 플로팅 버튼 제어
    const mainFabBtn = document.getElementById('mainFabBtn');
    const fabMenu = document.getElementById('fabMenu');
    const fabIcon = document.getElementById('fabIcon');
    let isFabOpen = false;

    function toggleFab() {
        isFabOpen = !isFabOpen;
        if (isFabOpen) {
            fabMenu.classList.remove('hidden');
            setTimeout(() => fabMenu.classList.remove('scale-0', 'opacity-0'), 10);
            fabIcon.style.transform = 'rotate(45deg)';
        } else {
            fabMenu.classList.add('scale-0', 'opacity-0');
            setTimeout(() => fabMenu.classList.add('hidden'), 300);
            fabIcon.style.transform = 'rotate(0deg)';
        }
    }
    mainFabBtn.addEventListener('click', toggleFab);

    // 수동 추가 모달 열기
    document.getElementById('manualAddBtn').addEventListener('click', () => {
        toggleFab(); 
        document.getElementById('transactionModal').classList.remove('hidden');
        document.getElementById('transactionModal').style.display = 'flex';
    });
    
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        document.getElementById('transactionModal').classList.add('hidden');
        setTimeout(() => document.getElementById('transactionModal').style.display = '', 200);
    });

    // AI 기능 (사진/문자)
    const receiptImageInput = document.getElementById('receiptImage');
    const pasteTextBtn = document.getElementById('pasteTextBtn');
    const aiLoading = document.getElementById('aiLoading');

    receiptImageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const selectedAiCard = document.getElementById('aiCardSelect').value; 
        toggleFab(); 
        const formData = new FormData();
        formData.append('receipt', file);
        formData.append('card', selectedAiCard); // 선택한 카드값 서버로 전송
        await processAIRequest(formData, selectedAiCard);
        e.target.value = ''; 
    });

    pasteTextBtn.addEventListener('click', async () => {
        const selectedAiCard = document.getElementById('aiCardSelect').value; 
        toggleFab(); 
        try {
            const text = await navigator.clipboard.readText();
            if (!text) throw new Error('클립보드빔');
            const formData = new FormData();
            formData.append('text', text);
            formData.append('card', selectedAiCard);
            await processAIRequest(formData, selectedAiCard);
        } catch (err) {
            const manualText = prompt("카드결제 문자를 붙여넣어라 냥!");
            if (manualText) {
                const formData = new FormData();
                formData.append('text', manualText);
                formData.append('card', selectedAiCard);
                await processAIRequest(formData, selectedAiCard);
            }
        }
    });

    // AI 일괄 저장 로직 (DB에 바로 꽂힘)
    async function processAIRequest(formData, forcedCard) {
        aiLoading.classList.remove('hidden'); 
        aiLoading.style.display = 'flex';

        try {
            const response = await fetch(AI_SERVER_URL, { method: 'POST', body: formData });
            if (!response.ok) throw new Error('서버 에러');
            const result = await response.json();
            
            if (result.success) {
                alert(`🐾 뾰로롱! [${forcedCard}] 카드로 ${result.count}건 자동 저장됐다냥!`);
                fetchTransactions(); // DB에서 최신 데이터 다시 불러오기
            }
        } catch (error) {
            alert('먼길이가 분석하다 츄르먹고 도망갔어옹... 😿');
        } finally {
            aiLoading.classList.add('hidden');
            aiLoading.style.display = 'none';
        }
    }

    // 수동 폼 저장 (서버 DB로 전송!)
    document.getElementById('transactionForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.querySelector('input[name="type"]:checked').value;
        const newRecord = {
            type: type,
            date: document.getElementById('dateInput').value,
            card: document.getElementById('cardInput').value,
            amount: Number(document.getElementById('amountInput').value),
            desc: document.getElementById('descInput').value
        };

        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRecord)
            });
            fetchTransactions(); // 저장 후 새로고침
        } catch(err) {
            alert('저장 실패했다냥!');
        }
        
        document.getElementById('transactionModal').classList.add('hidden');
        document.getElementById('transactionForm').reset();
        document.getElementById('dateInput').value = new Date().toISOString().split('T')[0];
    });

    // 새로고침 버튼
    document.getElementById('refreshBtn').addEventListener('click', () => {
        fetchTransactions(); 
    });
});

// DB에서 데이터 불러오기 함수
async function fetchTransactions() {
    try {
        const response = await fetch(API_URL);
        const result = await response.json();
        if(result.success) {
            transactions = result.data;
            renderDashboard();
        }
    } catch(err) {
        console.error("데이터 못 불러왔어냥!", err);
    }
}

// 화면 그리기
function renderDashboard() {
    let inTotal = 0, outTotal = 0;
    const listEl = document.getElementById('transactionList');
    listEl.innerHTML = '';

    const filteredTransactions = transactions.filter(t => {
        if (currentTab === 'all') return true;
        return t.card === currentTab;
    });

    if (filteredTransactions.length === 0) {
        listEl.innerHTML = `
            <div class="text-center py-16 opacity-80 mt-10">
                <div class="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-white shadow-lg">
                    <img src="https://i.ibb.co/LzyS3L15/3.jpg" alt="Sleepy Cat" class="w-full h-full object-cover">
                </div>
                <p class="text-gray-600 font-bold text-lg mb-1">아직 내역이 없냐옹!</p>
                <p class="text-sm text-gray-400">오른쪽 아래 ➕ 버튼 눌러서 추가해봐 🐾</p>
            </div>
        `;
    } else {
        const cardMap = { 'check':'체크카드', 'credit':'신용카드', 'tamna':'탐나는전', 'cash':'현금', 'other':'기타' };
        
        filteredTransactions.forEach(t => {
            if(t.type === 'income') inTotal += t.amount; else outTotal += t.amount;
            const isInc = t.type === 'income';
            const color = isInc ? 'text-blue-500' : 'text-rose-600';
            const prefix = isInc ? '+' : '-';
            const icon = isInc ? 'fa-fish text-blue-500 bg-blue-50' : 'fa-paw text-rose-500 bg-rose-50';
            
            const itemHtml = `
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-rose-50 flex items-center justify-between mb-3">
                    <div class="flex items-center space-x-4">
                        <div class="w-12 h-12 rounded-2xl flex items-center justify-center ${icon}">
                            <i class="fa-solid text-lg"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-800 text-lg">${t.desc}</h4>
                            <div class="flex items-center text-xs text-gray-500 mt-1">
                                <span>${t.date}</span><span class="mx-1">•</span><span>${cardMap[t.card] || t.card}</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-black ${color} text-lg tracking-tight">${prefix}${t.amount.toLocaleString()}원</div>
                        <!-- MongoDB 고유 ID(_id)로 삭제 -->
                        <button onclick="deleteTx('${t._id}')" class="text-xs text-gray-400 mt-1 px-2 py-1 hover:text-rose-500 bg-gray-50 rounded font-bold">삭제</button>
                    </div>
                </div>
            `;
            listEl.insertAdjacentHTML('beforeend', itemHtml);
        });
    }

    document.getElementById('totalIncome').textContent = inTotal.toLocaleString() + '원';
    document.getElementById('totalExpense').textContent = outTotal.toLocaleString() + '원';
    document.getElementById('totalBalance').textContent = (inTotal - outTotal).toLocaleString() + '원';
}

// DB에서 데이터 지우기
window.deleteTx = async function(id) {
    if(confirm('지울거냥? 😿')) {
        try {
            await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            fetchTransactions(); // 삭제 후 새로고침
        } catch(err) {
            alert('삭제 실패!');
        }
    }
}
