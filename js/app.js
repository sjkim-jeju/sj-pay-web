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

    // 탭 클릭 이벤트
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentTab = e.currentTarget.getAttribute('data-tab');
            tabBtns.forEach(b => b.className = "tab-btn px-4 py-2 rounded-full text-gray-500 hover:bg-rose-50 transition");
            e.currentTarget.className = "tab-btn px-4 py-2 rounded-full bg-rose-100 text-rose-700 font-bold transition";
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

    // 🌟 2번 요청 반영: 수동 추가 누를 때 현재 탭을 기본값으로 세팅!
    document.getElementById('manualAddBtn').addEventListener('click', () => {
        toggleFab(); 
        
        const cardInput = document.getElementById('cardInput');
        if (currentTab !== 'all') {
            cardInput.value = currentTab; // 지금 보고 있는 탭으로 자동 선택!
        } else {
            cardInput.value = 'check'; // 전체 탭일 때는 기본값 체크카드
        }

        document.getElementById('transactionModal').classList.remove('hidden');
        document.getElementById('transactionModal').style.display = 'flex';
    });
    
    // 모달창 X 버튼 클릭 시 닫기
    const transactionModal = document.getElementById('transactionModal');
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        transactionModal.classList.add('hidden');
        setTimeout(() => transactionModal.style.display = '', 200);
    });

    // 🌟 1번 요청 반영: 모달창 바깥(어두운 배경) 클릭 시 닫기!
    transactionModal.addEventListener('click', (e) => {
        if (e.target === transactionModal) {
            transactionModal.classList.add('hidden');
            setTimeout(() => transactionModal.style.display = '', 200);
        }
    });

    // AI 통신 로직 (사진/문자)
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

    // 폼 수동 저장
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
        
        transactionModal.classList.add('hidden');
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

// 신용카드 대금 납부 로직
window.payCreditCard = async
