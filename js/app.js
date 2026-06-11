const AI_SERVER_URL = 'https://sj-pay.onrender.com/api/analyze'; 
const API_URL = 'https://sj-pay.onrender.com/api/transactions';
let transactions = [];
let currentTab = 'all';

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('dateInput').value = new Date().toISOString().split('T')[0];
    fetchTransactions();

    // 콤마 자동 생성
    const amountInput = document.getElementById('amountInput');
    amountInput.addEventListener('input', function(e) {
        let value = this.value.replace(/[^0-9]/g, '');
        this.value = value ? Number(value).toLocaleString() : '';
    });

    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentTab = e.currentTarget.getAttribute('data-tab');
            tabBtns.forEach(b => b.className = "tab-btn px-4 py-2 rounded-full text-gray-500 hover:bg-rose-50 transition");
            e.currentTarget.className = "tab-btn px-4 py-2 rounded-full bg-rose-100 text-rose-700 font-bold transition";
            renderDashboard();
        });
    });

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

    document.getElementById('manualAddBtn').addEventListener('click', () => {
        toggleFab(); 
        document.getElementById('transactionModal').classList.remove('hidden');
        document.getElementById('transactionModal').style.display = 'flex';
    });
    
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        document.getElementById('transactionModal').classList.add('hidden');
        setTimeout(() => document.getElementById('transactionModal').style.display = '', 200);
    });

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
        formData.append('card', selectedAiCard);
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

    async function processAIRequest(formData, forcedCard) {
        aiLoading.classList.remove('hidden'); 
        aiLoading.style.display = 'flex';

        try {
            const response = await fetch(AI_SERVER_URL, { method: 'POST', body: formData });
            if (!response.ok) throw new Error('서버 에러');
            const result = await response.json();
            
            if (result.success) {
                const cardName = forcedCard ? `[${forcedCard}]` : 'AI 자동';
                alert(`🐾 뾰로롱! ${cardName}로 ${result.count}건 자동 저장됐다냥!`);
                fetchTransactions(); 
            }
        } catch (error) {
            alert('먼길이가 분석하다 츄르먹고 도망갔어옹... 😿');
        } finally {
            aiLoading.classList.add('hidden');
            aiLoading.style.display = 'none';
        }
    }

    document.getElementById('transactionForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.querySelector('input[name="type"]:checked').value;
        const rawAmount = document.getElementById('amountInput').value.replace(/,/g, ''); 

        const newRecord = {
            type: type,
            date: document.getElementById('dateInput').value,
            card: document.getElementById('cardInput').value,
            amount: Number(rawAmount),
            desc: document.getElementById('descInput').value
        };

        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRecord)
            });
            fetchTransactions(); 
        } catch(err) {
            alert('저장 실패했다냥!');
        }
        
        document.getElementById('transactionModal').classList.add('hidden');
        document.getElementById('transactionForm').reset();
        document.getElementById('dateInput').value = new Date().toISOString().split('T')[0];
    });

    document.getElementById('refreshBtn').addEventListener('click', () => {
        fetchTransactions(); 
    });
});

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

// 💳 신용카드 대금 납부 로직
window.payCreditCard = async function(currentCreditDebt) {
    if(currentCreditDebt >= 0) {
        alert("납부할 신용카드 대금이 없습니다냥! 😻");
        return;
    }

    const debtAmount = Math.abs(currentCreditDebt);
    const amountStr = prompt(`💳 현재 신용카드 누적 사용액은 ${debtAmount.toLocaleString()}원입니다.\n얼마를 통장(체크)에서 빼서 납부하시겠습니까? (숫자만 입력)`, debtAmount);
    
    if(!amountStr) return;
    const amountToPay = Number(amountStr.replace(/[^0-9]/g, ''));
    
    if(!amountToPay || amountToPay <= 0) return alert("올바른 금액을 입력해주세냥!");

    const dateStr = new Date().toISOString().split('T')[0];
    const tx1 = { type: 'expense', date: dateStr, card: 'check', amount: amountToPay, desc: '💳 신용카드 대금 납부' };
    const tx2 = { type: 'income', date: dateStr, card: 'credit', amount: amountToPay, desc: '💳 신용카드 대금 납부' };

    try {
        await fetch(API_URL, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(tx1) });
        await fetch(API_URL, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(tx2) });
        alert(`카드값 ${amountToPay.toLocaleString()}원 납부 완료! 홀가분하다냥! 🎉`);
        fetchTransactions(); 
    } catch(e) {
        alert('납부 중 오류가 발생했어냥 😿');
    }
}

// 🏦 현금 계좌 입금 로직 (NEW!)
window.depositCash = async function(currentCash) {
    if(currentCash <= 0) {
        if(!confirm("현재 수중에 현금이 0원입니다냥! 그래도 계좌 입금을 진행할까냥?")) return;
    }

    const defaultAmt = currentCash > 0 ? currentCash : 0;
    const amountStr = prompt(`💵 현재 현금 잔액은 ${currentCash.toLocaleString()}원입니다.\n얼마를 통장(체크카드)으로 입금하시겠습니까? (숫자만 입력)`, defaultAmt);
    
    if(!amountStr) return;
    const amountToDeposit = Number(amountStr.replace(/[^0-9]/g, ''));
    
    if(!amountToDeposit || amountToDeposit <= 0) return alert("올바른 금액을 입력해주세냥!");

    const dateStr = new Date().toISOString().split('T')[0];
    // 1. 현금에서 돈 빠짐 (지출)
    const tx1 = { type: 'expense', date: dateStr, card: 'cash', amount: amountToDeposit, desc: '🏦 통장(체크) 입금' };
    // 2. 통장에 돈 들어옴 (수입)
    const tx2 = { type: 'income', date: dateStr, card: 'check', amount: amountToDeposit, desc: '💵 현금 입금' };

    try {
        await fetch(API_URL, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(tx1) });
        await fetch(API_URL, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(tx2) });
        alert(`현금 ${amountToDeposit.toLocaleString()}원 통장 입금 완료! 든든하다냥! 🎉`);
        fetchTransactions(); 
    } catch(e) {
        alert('입금 중 오류가 발생했어냥 😿');
    }
}

function renderDashboard() {
    const listEl = document.getElementById('transactionList');
    const summaryContainer = document.getElementById('summaryContainer');
    const summaryTitle = document.getElementById('summaryTitle');
    listEl.innerHTML = '';

    let bal = { check: 0, credit: 0, tamna: 0, cash: 0 };
    transactions.forEach(t => {
        const amt = t.type === 'income' ? t.amount : -t.amount;
        if(bal[t.card] !== undefined) bal[t.card] += amt;
    });

    if (currentTab === 'all') {
        summaryTitle.textContent = '내 자산 현황 🐾';
        summaryContainer.innerHTML = `
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-purple-50 p-3 rounded-xl border border-purple-100">
                    <div class="text-xs text-purple-600 mb-1 font-bold">💜 통장 (체크)</div>
                    <div class="font-bold text-gray-800 text-lg">${bal.check.toLocaleString()}원</div>
                </div>
                <div class="bg-rose-50 p-3 rounded-xl border border-rose-100 relative">
                    <div class="text-xs text-rose-600 mb-1 font-bold">💖 신용카드 (사용액)</div>
                    <div class="font-bold text-rose-600 text-lg">${bal.credit.toLocaleString()}원</div>
                    <button onclick="payCreditCard(${bal.credit})" class="absolute bottom-2 right-2 text-[10px] bg-rose-200 text-rose-700 px-2 py-1 rounded-md font-bold shadow-sm hover:bg-rose-300">대금납부</button>
                </div>
                <div class="bg-orange-50 p-3 rounded-xl border border-orange-100">
                    <div class="text-xs text-orange-600 mb-1 font-bold">🍊 탐나는전</div>
                    <div class="font-bold text-gray-800 text-lg">${bal.tamna.toLocaleString()}원</div>
                </div>
                <!-- 💡 현금 칸에 계좌입금 버튼 추가됨! -->
                <div class="bg-emerald-50 p-3 rounded-xl border border-emerald-100 relative">
                    <div class="text-xs text-emerald-600 mb-1 font-bold">💵 현금</div>
                    <div class="font-bold text-gray-800 text-lg">${bal.cash.toLocaleString()}원</div>
                    <button onclick="depositCash(${bal.cash})" class="absolute bottom-2 right-2 text-[10px] bg-emerald-200 text-emerald-700 px-2 py-1 rounded-md font-bold shadow-sm hover:bg-emerald-300">계좌입금</button>
                </div>
            </div>
        `;
    } else {
        const tabNames = { check: '체크카드', credit: '신용카드', tamna: '탐나는전', cash: '현금', other: '기타' };
        summaryTitle.textContent = `${tabNames[currentTab]} 현황 🐾`;
        
        let tabIn = 0, tabOut = 0;
        transactions.filter(t => t.card === currentTab).forEach(t => {
            if(t.type === 'income') tabIn += t.amount; else tabOut += t.amount;
        });

        // 💡 신용카드 탭과 현금 탭에 각각 큰 버튼 추가!
        let extraBtn = '';
        if(currentTab === 'credit') {
            extraBtn = `<button onclick="payCreditCard(${bal.credit})" class="w-full mt-3 bg-rose-100 text-rose-600 py-2 rounded-xl font-bold hover:bg-rose-200 transition">💳 이번 달 대금 납부하기</button>`;
        } else if(currentTab === 'cash') {
            extraBtn = `<button onclick="depositCash(${bal.cash})" class="w-full mt-3 bg-emerald-100 text-emerald-600 py-2 rounded-xl font-bold hover:bg-emerald-200 transition">🏦 통장(체크)으로 입금하기</button>`;
        }

        summaryContainer.innerHTML = `
            <div class="flex flex-col space-y-3">
                <div class="flex justify-between items-end border-b border-rose-50 pb-2">
                    <span class="text-gray-600">들어온 돈 🐟</span>
                    <span class="text-blue-500 font-bold text-lg">+${tabIn.toLocaleString()}원</span>
                </div>
                <div class="flex justify-between items-end border-b border-rose-50 pb-2">
                    <span class="text-gray-600">나간 돈 😿</span>
                    <span class="text-rose-500 font-bold text-lg">-${tabOut.toLocaleString()}원</span>
                </div>
                <div class="flex justify-between items-end pt-1">
                    <span class="text-gray-800 font-bold">합계 잔액 😻</span>
                    <span class="text-gray-800 font-bold text-2xl">${(tabIn - tabOut).toLocaleString()}원</span>
                </div>
                ${extraBtn}
            </div>
        `;
    }

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
                        <button onclick="deleteTx('${t._id}')" class="text-xs text-gray-400 mt-1 px-2 py-1 hover:text-rose-500 bg-gray-50 rounded font-bold">삭제</button>
                    </div>
                </div>
            `;
            listEl.insertAdjacentHTML('beforeend', itemHtml);
        });
    }
}

window.deleteTx = async function(id) {
    if(confirm('지울거냥? 😿')) {
        try {
            await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            fetchTransactions(); 
        } catch(err) {
            alert('삭제 실패!');
        }
    }
}
