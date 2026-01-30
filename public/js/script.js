document.addEventListener('DOMContentLoaded', () => {
    console.log('Mock Munchies script loaded.');

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add click handler for start button
    const startBtns = document.querySelectorAll('.btn-munchies:not(#demoSubmitBtn)');
    startBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            alert('即将跳转到岗位选择页面... (功能开发中)');
        });
    });

    // Micro Demo Interaction
    const demoSubmitBtn = document.getElementById('demoSubmitBtn');
    const demoInput = document.getElementById('demoInput');
    const demoFeedback = document.getElementById('demoFeedback');
    const feedbackText = document.getElementById('feedbackText');

    if (demoSubmitBtn && demoInput && demoFeedback) {
        demoSubmitBtn.addEventListener('click', () => {
            const answer = demoInput.value.trim();
            if (!answer) {
                alert('请输入你的回答');
                return;
            }

            // Simulate AI processing state
            const originalBtnText = demoSubmitBtn.textContent;
            demoSubmitBtn.textContent = 'AI 分析中...';
            demoSubmitBtn.disabled = true;
            demoInput.disabled = true;

            setTimeout(() => {
                // Static feedback logic based on length (just for demo fun)
                let feedback = "";
                if (answer.length < 20) {
                    feedback = "你的回答有点简短。建议结合具体的案例（STAR原则），详细描述你是如何意识到这个缺点，以及你正在采取什么措施来改进它。这样会让回答更具说服力。";
                } else {
                    feedback = "这是一个不错的开始！你坦诚地面对了自己的不足。建议进一步强调这个缺点对工作实际场景的积极影响（如果有），或者重点展示你的改进成效，让面试官看到你的成长型思维。";
                }

                feedbackText.textContent = feedback;
                demoFeedback.classList.remove('hidden');
                
                // Restore button state
                demoSubmitBtn.textContent = originalBtnText;
                demoSubmitBtn.disabled = false;
                demoInput.disabled = false;
                
                // Scroll to feedback
                demoFeedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 1500); // 1.5s delay
        });
    }
});
