const AI_SERVER_URL = 'https://sj-pay.onrender.com/api/analyze'; 
let transactions = JSON.parse(localStorage.getItem('cat_transactions')) || [];
let currentTab = 'all';

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('dateInput').value = new Date().toISOString().split('T')[0];
    renderDashboard();

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

    // 🌟 AI 기능 🌟
    const receiptImageInput = document.getElementById('receiptImage');
    const pasteTextBtn = document.getElementById('pasteTextBtn');
    const aiLoading = document.getElementById('aiLoading');

    receiptImageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // 💡 내가 선택한 결제수단 가져오기!
        const selectedAiCard = document.getElementById('aiCardSelect').value; 
        
        toggleFab(); 
        const formData = new FormData();
        formData.append('receipt', file);
        await processAIRequest(formData, selectedAiCard); // 덮어씌울 카드값 넘겨줌!
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
            await processAIRequest(formData, selectedAiCard);
        } catch (err) {
            const manualText = prompt("카드결제 문자를 붙여넣어라 냥!");
            if (manualText) {
                const formData = new FormData();
                formData.append('text', manualText);
                await processAIRequest(formData, selectedAiCard);
            }
        }
    });

    // 🌟 AI 일괄 저장 + 결제수단 강제 덮어쓰기 로직 🌟
    async function processAIRequest(formData, forcedCard) {
        aiLoading.classList.remove('hidden'); 
        aiLoading.style.display = 'flex';

        try {
            const response = await fetch(AI_SERVER_URL, { method: 'POST', body: formData });
            if (!response.ok) throw new Error('서버 에러');
            const result = await response.json();
            
            if (result.success && result.data) {
                const items = Array.isArray(result.data) ? result.data : [result.data];
                let addedCount = 0;
                
                items.forEach(data => {
                    if(data.amount && data.desc) {
                        const newRecord = {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                            type: data.type || 'expense',
                            date: data.date || new Date().toISOString().split('T')[0],
                            card: forcedCard, // 💡 AI가 뭐라고 했든 무조건 내가 선택한 카드로 저장!!!
                            amount: Number(data.amount),
                            desc: data.desc
                        };
                        transactions.push(newRecord);
                        addedCount++;
                    }
                });

                localStorage.setItem('cat_transactions', JSON.stringify(transactions)); 
                renderDashboard();
                alert(`🐾 뾰로롱! [${forcedCard}] 카드로 ${addedCount}건 자동 저장됐다냥!`);
            }
        } catch (error) {
            alert('먼길이가 분석하다 츄르먹고 도망갔어옹... 😿');
        } finally {
            aiLoading.classList.add('hidden');
            aiLoading.style.display = 'none';
        }
    }

    // 폼 수동 저장
    document.getElementById('transactionForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.querySelector('input[name="type"]:checked').value;
        const newRecord = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            type: type,
            date: document.getElementById('dateInput').value,
            card: document.getElementById('cardInput').value,
            amount: Number(document.getElementById('amountInput').value),
            desc: document.getElementById('descInput').value
        };

        transactions.push(newRecord);
        localStorage.setItem('cat_transactions', JSON.stringify(transactions)); 
        renderDashboard();
        
        document.getElementById('transactionModal').classList.add('hidden');
        document.getElementById('transactionForm').reset();
        document.getElementById('dateInput').value = new Date().toISOString().split('T')[0];
    });

    document.getElementById('refreshBtn').addEventListener('click', () => {
        if(confirm('진짜 데이터를 싹 다 지울거냥? 🙀 (복구 불가)')) {
            localStorage.removeItem('cat_transactions');
            transactions = [];
            renderDashboard();
        }
    });
});

// 화면 그리기 (필터링 적용)
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
        
        filteredTransactions.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(t => {
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
                        <button onclick="deleteTx('${t.id}')" class="text-xs text-gray-400 mt-1 px-2 py-1 hover:text-rose-500 bg-gray-50 rounded font-bold">삭제</button>
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

window.deleteTx = function(id) {
    if(confirm('지울거냥? 😿')) {
        transactions = transactions.filter(t => t.id !== id);
        localStorage.setItem('cat_transactions', JSON.stringify(transactions)); 
        renderDashboard();
    }
}
