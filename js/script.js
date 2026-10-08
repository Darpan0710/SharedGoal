// SharedGoal Frontend Interactions
// Supabase client — anon key is safe in the browser; RLS enforces access control
// Get your anon key from: Supabase Dashboard → Project Settings → API
const SUPABASE_URL = 'https://aanxnlabaqmsvxdcnmqg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_z2W6GCRu51hFfT08w17NOA_JeoVP8HS';
window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
let resolveAuthReady;
const authReady = new Promise(resolve => {
    resolveAuthReady = resolve;
});
const PENDING_HELP_CONTRIBUTION_KEY = 'pendingHelpContribution';

// Global notification toast
function showToast(message) {
    let toast = $('#globalToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'globalToast';
        toast.className = 'toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('show'), 2800);
}

function setFieldValidation(field, isValid, message) {
    if (!field) return isValid;

    const errorId = `${field.id}ValidationError`;
    let error = document.getElementById(errorId);
    if (!isValid) {
        field.classList.add('field-invalid');
        field.setAttribute('aria-invalid', 'true');
        if (!error) {
            error = document.createElement('small');
            error.id = errorId;
            error.className = 'field-validation-error';
            error.setAttribute('role', 'alert');
            field.insertAdjacentElement('afterend', error);
        }
        error.textContent = message;
        field.setAttribute('aria-describedby', errorId);
        return false;
    }

    field.classList.remove('field-invalid');
    field.removeAttribute('aria-invalid');
    if (field.getAttribute('aria-describedby') === errorId) {
        field.removeAttribute('aria-describedby');
    }
    error?.remove();
    return true;
}

function bindFieldValidation(field, isValid, message) {
    if (!field) return;
    const validate = () => setFieldValidation(field, isValid(field), message);
    field.addEventListener('input', validate);
    field.addEventListener('change', validate);
}

function localDateValue(date = new Date()) {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

// Modal management with focus trapping and restoration
let lastFocusedElement = null;

const getFocusables = container => {
    return Array.from(container.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetWidth > 0 || el.offsetHeight > 0);
};

const showModal = (id, triggerElement) => {
    const modal = $(id);
    if (!modal) return;

    lastFocusedElement = triggerElement || document.activeElement;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');

    const focusables = getFocusables(modal);
    setTimeout(() => {
        if (focusables.length) {
            focusables[0].focus();
        } else {
            modal.focus();
        }
    }, 40);
};

const closeModal = () => {
    if ($('#loginOverlay')?.classList.contains('show')) {
        sessionStorage.removeItem(PENDING_HELP_CONTRIBUTION_KEY);
    }
    $$('.overlay.show').forEach(overlay => {
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');
    });

    if (lastFocusedElement?.focus) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }
};

const openModal = (id, triggerElement) => {
    closeModal();
    showModal(id, triggerElement);
};

// Modal close button and backdrop click listeners
$$('.close').forEach(b => b.onclick = () => closeModal());

$$('.overlay').forEach(o => {
    o.addEventListener('click', e => {
        if (e.target === o) closeModal();
    });
});

// Keyboard navigation: Escape key dismiss and Tab focus trapping
document.addEventListener('keydown', e => {
    const activeOverlay = $('.overlay.show');
    if (!activeOverlay) {
        if (e.key === 'Escape' && $('#mobileMenu')?.classList.contains('show')) {
            toggleMobileMenu(false);
            $('#menuBtn')?.focus();
        }
        return;
    }

    if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
        return;
    }

    if (e.key === 'Tab') {
        const focusables = getFocusables(activeOverlay);
        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
});

// Mobile navigation dropdown
const menuBtn = $('#menuBtn');
const mobileMenu = $('#mobileMenu');

function toggleMobileMenu(forceState) {
    if (!mobileMenu || !menuBtn) return;
    const shouldOpen = forceState !== undefined ? forceState : !mobileMenu.classList.contains('show');
    mobileMenu.classList.toggle('show', shouldOpen);
    menuBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', shouldOpen ? 'Close navigation menu' : 'Open navigation menu');
}

menuBtn?.addEventListener('click', e => {
    e.stopPropagation();
    toggleMobileMenu();
});

$$('#mobileMenu a, #mobileMenu button').forEach(item => {
    item.addEventListener('click', () => toggleMobileMenu(false));
});

document.addEventListener('click', e => {
    if (mobileMenu && menuBtn && !mobileMenu.contains(e.target) && !menuBtn.contains(e.target)) {
        toggleMobileMenu(false);
    }
});

// Profile and notification modal triggers
$$('[data-profile]').forEach(b => b.onclick = () => openModal('#profileOverlay', b));
$$('[data-login]').forEach(b => b.onclick = () => openModal('#loginOverlay', b));
$('#notificationBtn')?.addEventListener('click', async () => {
    await loadNotifications();
    openModal('#notificationsOverlay', $('#notificationBtn'));
});

// Prevent past dates in date inputs
$$('input[type="date"]').forEach(input => {
    input.min = new Date().toISOString().split('T')[0];
});

// Shared creation wizard: entry choice, category choice, then the existing goal steps.
let currentStep = 1;
let editingFromReview = false;
let entryContext = 'HOME';
let creationType = 'PERSONAL_GOAL';
let selectedCreationCategory = 'Birthday';
let selectedHelpCategory = 'assistance';
let selectedHelpProofFile = null;
let selectedHelpProofPath = null;
let selectedHelpCreatorQrPath = null;

const PERSONAL_GOAL_OPTIONS = [
    { value: 'Birthday', label: '🎂 Birthday', detail: 'Gifts, parties, celebrations' },
    { value: 'Wedding', label: '💍 Wedding', detail: 'Group registry & blessing gifts' },
    { value: 'Trip', label: '✈️ Trip', detail: 'Vacations, cabin rentals, travel' },
    { value: 'Farewell', label: '🎉 Farewell', detail: 'Colleagues, send-offs, memories' },
    { value: 'College Event', label: '🎓 College Event', detail: 'Fests, batch projects, reunions' },
    { value: 'Festival', label: '🎁 Festival', detail: 'Diwali, Christmas, communal feasts' },
    { value: 'Custom', label: '✏️ Custom', detail: 'Your unique occasion' }
];
const HELP_REQUEST_OPTIONS = [
    { value: 'education', label: '📚 Education', detail: 'Tuition, books, supplies' },
    { value: 'medical', label: '🏥 Medical', detail: 'Healthcare, treatments, medicines' },
    { value: 'basic', label: '🏠 Basic Needs', detail: 'Groceries, emergency support' },
    { value: 'assistance', label: '🤝 Assistance', detail: 'Urgent support and relief' },
    { value: 'custom', label: '✏️ Custom', detail: 'Describe a help category' }
];
const HELP_CATEGORY_LABELS = {
    education: 'Education',
    medical: 'Medical',
    basic: 'Basic Needs',
    assistance: 'Assistance'
};
const HELP_PROOF_BUCKET = 'help-request-proofs';
const HELP_PROOF_MAX_SIZE = 10 * 1024 * 1024;
const GOAL_PAYMENT_QR_BUCKET = 'goal-payment-qr';
let proofReferenceSchemaAvailable = null;
const goalData = {
    occasion: 'Birthday',
    customOccasion: '',
    isCustomOccasion: false,
    creationType: 'PERSONAL_GOAL',
    entryContext: 'HOME',
    name: '',
    description: '',
    target: 0,
    deadline: '',
    style: 'Equal split',
    visibility: 'Private',
    helpCategory: 'assistance'
};
let activeGoalId = null;
let currentContributeSplitStyle = 'Custom amounts';
let currentContributeFixedAmount = null;
let currentContributeRemaining = null;
let currentContributionPaymentDetails = { upiId: '', qrPath: '', recipient: 'creator' };
let contributionDetailsVersion = 0;

function setContributionPaymentDetails(upiId = '', qrPath = '', recipient = 'creator') {
    currentContributionPaymentDetails = { upiId: upiId || '', qrPath: qrPath || '', recipient };
    refreshContributionPaymentDetails();
}

function refreshContributionPaymentDetails() {
    const containers = Array.from(document.querySelectorAll('.contribution-payment-details'));
    if (!containers.length) return;

    const version = ++contributionDetailsVersion;
    const amount = Number($('#contributionAmount')?.value || 0);
    const amountText = Number.isFinite(amount) && amount > 0
        ? `₹${amount.toLocaleString('en-IN')}`
        : 'the amount entered above';
    const paymentMethod = $('.payments button.active')?.textContent?.trim() || 'UPI';
    const { upiId, qrPath, recipient } = currentContributionPaymentDetails;

    containers.forEach(container => {
        container.replaceChildren();

        const message = document.createElement('p');
        message.style.margin = '0';

        if (paymentMethod !== 'UPI') {
            message.style.color = 'var(--text-secondary)';
            message.textContent = 'Cash contribution selected. Submit the contribution for confirmation.';
            container.appendChild(message);
            return;
        }

        if (!upiId && !qrPath) {
            message.style.color = 'var(--text-secondary)';
            message.textContent = recipient === 'request owner'
                ? 'Payment details have not been added by the request owner yet.'
                : 'Payment details have not been added by the creator yet.';
            container.appendChild(message);
            return;
        }

        message.textContent = `Pay ${amountText} directly to the ${recipient} using these UPI details. After paying, submit this contribution for confirmation.`;
        container.appendChild(message);

        if (upiId) {
            const upi = document.createElement('p');
            upi.style.margin = '8px 0 0';
            const label = document.createElement('strong');
            label.textContent = 'UPI ID: ';
            upi.append(label, document.createTextNode(upiId));
            container.appendChild(upi);
        }

        if (qrPath) {
            const qrLabel = document.createElement('p');
            qrLabel.style.margin = '8px 0 0';
            qrLabel.textContent = 'UPI QR:';
            container.appendChild(qrLabel);

            const qrStatus = document.createElement('p');
            qrStatus.style.margin = '4px 0 0';
            qrStatus.style.color = 'var(--text-secondary)';
            qrStatus.textContent = 'Loading QR…';
            container.appendChild(qrStatus);

            sb.storage.from(GOAL_PAYMENT_QR_BUCKET).createSignedUrl(qrPath, 3600)
                .then(({ data, error }) => {
                    if (version !== contributionDetailsVersion || !container.isConnected) return;
                    if (error || !data?.signedUrl) {
                        console.error('Unable to create a signed UPI QR link:', error);
                        qrStatus.textContent = 'QR unavailable right now.';
                        return;
                    }

                    const image = document.createElement('img');
                    image.src = data.signedUrl;
                    image.alt = 'UPI QR code';
                    image.style.cssText = 'display: block; max-width: 180px; max-height: 180px; border-radius: 10px; border: 1px solid var(--line); margin-top: 6px;';
                    qrStatus.replaceWith(image);
                })
                .catch(error => {
                    if (version !== contributionDetailsVersion || !container.isConnected) return;
                    console.error('Unable to create a signed UPI QR link:', error);
                    qrStatus.textContent = 'QR unavailable right now.';
                });
        }
    });
}

function getGoalContributionStyle(goal) {
    const storedStyle = goal.rawGoal.contribution_style || goal.rawGoal.split_type;
    if (storedStyle) return storedStyle;
    try {
        return localStorage.getItem(`sharedGoalContributionStyle:${goal.goalId}`) || 'Equal split';
    } catch (error) {
        console.warn('Unable to read this browser saved contribution style:', error);
        return 'Equal split';
    }
}

function configureGoalContribution(goal) {
    const input = $('#contributionAmount');
    if (!input) return;

    const style = getGoalContributionStyle(goal);
    const remaining = Math.max(0, Number(goal.target) - Number(goal.collected));
    currentContributeSplitStyle = style;
    currentContributeRemaining = remaining;

    $$('.quick button').forEach(button => {
        button.disabled = style === 'Equal split';
    });

    if (style === 'Equal split') {
        const assigned = calculateEqualSplit(goal.target, goal.members);
        currentContributeFixedAmount = Math.min(assigned, remaining);
        input.value = currentContributeFixedAmount.toFixed(2).replace(/\.00$/, '');
        input.readOnly = true;
        input.removeAttribute('max');
    } else {
        currentContributeFixedAmount = null;
        input.value = '';
        input.readOnly = false;
        input.min = '0.01';
        input.max = String(remaining);
        $$('.quick button').forEach(button => {
            button.disabled = Number(button.dataset.amount) > remaining;
        });
    }

    setContributionPaymentDetails(
        goal.rawGoal?.creator_upi_id,
        goal.rawGoal?.creator_qr_path,
        'creator'
    );
}

function calculateEqualSplit(targetAmount, memberCount) {
    const target = Number(targetAmount) || 0;
    const members = Number(memberCount) > 0 ? Number(memberCount) : 1;
    return Number((target / members).toFixed(2));
}

function calculateCustomSplit(targetAmount, allocations) {
    const target = Number(targetAmount) || 0;
    const totalAllocated = (allocations || []).reduce((sum, value) => sum + (Number(value) || 0), 0);
    return {
        totalAllocated,
        remaining: Number((target - totalAllocated).toFixed(2)),
        exceedsTarget: totalAllocated > target
    };
}

window.calculateEqualSplit = calculateEqualSplit;
window.calculateCustomSplit = calculateCustomSplit;

function getPageEntryContext() {
    const pageName = window.location.pathname.split('/').pop();
    if (pageName === 'my-goals.html') return 'MY_GOALS';
    if (pageName === 'help.html') return 'HELP_SOMEONE';
    return 'HOME';
}

function getHelpCategoryLabel(category = selectedHelpCategory) {
    return HELP_CATEGORY_LABELS[category] || category;
}

function renderCreationCategories() {
    const choices = $('#step1Choices');
    const title = $('#categoryStepTitle');
    const options = creationType === 'HELP_SOMEONE' ? HELP_REQUEST_OPTIONS : PERSONAL_GOAL_OPTIONS;
    if (!choices) return;

    const selectedValue = creationType === 'HELP_SOMEONE'
        ? (HELP_REQUEST_OPTIONS.some(option => option.value === selectedCreationCategory) ? selectedCreationCategory : 'education')
        : (PERSONAL_GOAL_OPTIONS.some(option => option.value === selectedCreationCategory) ? selectedCreationCategory : 'Birthday');
    selectedCreationCategory = selectedValue;
    if (title) {
        title.textContent = creationType === 'HELP_SOMEONE'
            ? 'Choose a Help Someone category'
            : 'Choose a Personal Goal occasion';
    }

    choices.innerHTML = options.map(option => `
        <button type="button" class="${option.value === selectedCreationCategory ? 'selected' : ''}" data-value="${option.value}">
            ${option.label}<small>${option.detail}</small>
        </button>
    `).join('');

    const personalCustom = $('#customCategoryWrap');
    const helpCustom = $('#customHelpCategoryWrap');
    if (personalCustom) personalCustom.style.display = creationType === 'PERSONAL_GOAL' && selectedValue === 'Custom' ? 'block' : 'none';
    if (helpCustom) helpCustom.style.display = creationType === 'HELP_SOMEONE' && selectedValue === 'custom' ? 'block' : 'none';
}

function updateHelpCategoryLabel() {
    const label = $('#selectedHelpCategoryLabel');
    if (label) label.textContent = `Category: ${getHelpCategoryLabel()}`;
}

function openHelpRequestFlow(triggerEl) {
    const helpOverlay = $('#helpOverlay');
    updateHelpCategoryLabel();
    if ($('#helpRequestStepLabel')) $('#helpRequestStepLabel').textContent = 'Step 3 of 3';
    if (!helpOverlay) {
        sessionStorage.setItem('pendingHelpRequestSelection', JSON.stringify({
            category: selectedHelpCategory,
            entryContext,
            selectedCreationCategory,
            customCategory: selectedCreationCategory === 'custom' ? selectedHelpCategory : ''
        }));
        window.location.href = 'help.html';
        return;
    }
    closeModal();
    openModal('#helpOverlay', triggerEl || $('#createHelpBtn'));
}

function goToStep(n) {
    currentStep = n;
    $$('.goal-step').forEach(stepEl => {
        stepEl.classList.toggle('active', Number(stepEl.dataset.step) === n);
    });

    const stepLabel = $('#currentStepLabel');
    if (stepLabel) {
        const stepNumber = n === 0 ? 1 : n + 1;
        const totalSteps = creationType === 'HELP_SOMEONE' ? 3 : 7;
        stepLabel.textContent = `Step ${stepNumber} of ${totalSteps}`;
    }

    if (n === 6) {
        editingFromReview = false;
        updateReviewScreen();
    }
}

function updateReviewScreen() {
    const revOccasion = $('#revOccasion');
    const revName = $('#revName');
    const revDesc = $('#revDesc');
    const revTarget = $('#revTarget');
    const revDeadline = $('#revDeadline');
    const revStyle = $('#revStyle');
    const revVisibility = $('#revVisibility');
    if (revOccasion) revOccasion.textContent = goalData.occasion;
    if (revName) revName.textContent = goalData.name || 'Untitled Goal';
    if (revDesc) revDesc.textContent = goalData.description || 'No description provided.';
    if (revTarget) revTarget.textContent = '₹' + Number(goalData.target || 0).toLocaleString('en-IN');

    if (revDeadline) {
        if (goalData.deadline) {
            const daysLeft = Math.max(1, Math.ceil((new Date(goalData.deadline) - new Date()) / (1000 * 60 * 60 * 24)));
            revDeadline.textContent = `${goalData.deadline} (${daysLeft} days left)`;
        } else {
            revDeadline.textContent = 'No deadline';
        }
    }

    if (revStyle) revStyle.textContent = goalData.style;
    if (revVisibility) revVisibility.textContent = 'Private';

}

$$('.edit-step-btn').forEach(btn => {
    btn.onclick = () => {
        const targetStep = Number(btn.dataset.gotoStep);
        if (targetStep) {
            editingFromReview = true;
            goToStep(targetStep);
        }
    };
});

function startCreationFlow(context, triggerEl, presetCategory = '') {
    editingFromReview = false;
    entryContext = context;
    $$('.field-invalid').forEach(field => setFieldValidation(field, true, ''));
    const helpCategoryPresets = {
        education: 'education',
        medical: 'medical',
        'basic needs': 'basic',
        assistance: 'assistance'
    };
    const normalizedPreset = presetCategory.trim().toLowerCase();
    const categoryPreset = normalizedPreset === 'custom'
        ? ''
        : helpCategoryPresets[normalizedPreset] || presetCategory;
    const presetIsHelpCategory = HELP_REQUEST_OPTIONS.some(option => option.value === categoryPreset);
    creationType = context === 'HELP_SOMEONE' || presetIsHelpCategory ? 'HELP_SOMEONE' : 'PERSONAL_GOAL';
    goalData.creationType = creationType;
    goalData.entryContext = entryContext;
    goalData.customOccasion = '';
    goalData.isCustomOccasion = false;
    goalData.helpCategory = 'assistance';
    selectedHelpProofFile = null;
    selectedHelpProofPath = null;
    selectedHelpCreatorQrPath = null;
    if ($('#helpProofFile')) $('#helpProofFile').value = '';
    if ($('#helpProofFileName')) $('#helpProofFileName').textContent = '';
    if ($('#helpCreatorUpiId')) $('#helpCreatorUpiId').value = '';
    if ($('#helpCreatorQrInput')) $('#helpCreatorQrInput').value = '';
    if ($('#helpCreatorQrName')) $('#helpCreatorQrName').textContent = 'No QR uploaded yet.';
    if ($('#removeHelpCreatorQrBtn')) $('#removeHelpCreatorQrBtn').style.display = 'none';
    if ($('#customOccasionInput')) $('#customOccasionInput').value = '';
    if ($('#customHelpCategoryInput')) $('#customHelpCategoryInput').value = '';
    selectedCreationCategory = categoryPreset || (creationType === 'HELP_SOMEONE' ? 'education' : 'Birthday');
    renderCreationCategories();
    $$('#creationTypeChoices button').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.creationType === creationType);
    });
    goToStep(context === 'HOME' && !categoryPreset ? 0 : 1);
    openModal('#createGoalOverlay', triggerEl);
}

$$('[data-create]').forEach(btn => {
    btn.onclick = () => {
        const context = getPageEntryContext();
        startCreationFlow(context, btn, btn.dataset.occasion || '');
    };
});

$$('.chips button').forEach(btn => {
    btn.onclick = () => startCreationFlow('HOME', btn, btn.dataset.occasion || '');
});

$('#createHelpBtn')?.addEventListener('click', event => {
    startCreationFlow('HELP_SOMEONE', event.currentTarget);
});
$('#bottomHelpBtn')?.addEventListener('click', event => {
    startCreationFlow('HELP_SOMEONE', event.currentTarget);
});

bindFieldValidation($('#customOccasionInput'), field => Boolean(field.value.trim()), 'Enter a custom occasion.');
bindFieldValidation($('#customHelpCategoryInput'), field => Boolean(field.value.trim()), 'Enter a custom help category.');
bindFieldValidation($('#goalName'), field => Boolean(field.value.trim()), 'Enter a name for your goal.');
bindFieldValidation($('#goalAmount'), field => Number.isFinite(Number(field.value)) && Number(field.value) >= 100, 'Enter a target amount of at least ₹100.');
bindFieldValidation($('#goalDeadline'), field => Boolean(field.value) && field.value >= localDateValue(), 'Choose today or a future deadline.');
bindFieldValidation($('#helpTitle'), field => Boolean(field.value.trim()), 'Enter a title for your request.');
bindFieldValidation($('#helpStory'), field => Boolean(field.value.trim()), 'Describe the situation and how the funds will be used.');
bindFieldValidation($('#helpAmount'), field => Number.isFinite(Number(field.value)) && Number(field.value) >= 500, 'Enter a target amount of at least ₹500.');

$('#backToHelpCategoriesBtn')?.addEventListener('click', () => {
    closeModal();
    creationType = 'HELP_SOMEONE';
    goalData.creationType = creationType;
    goalData.entryContext = entryContext;
    selectedCreationCategory = HELP_REQUEST_OPTIONS.some(option => option.value === selectedHelpCategory)
        ? selectedHelpCategory
        : 'custom';
    if (selectedCreationCategory === 'custom' && $('#customHelpCategoryInput')) {
        $('#customHelpCategoryInput').value = selectedHelpCategory;
        setFieldValidation($('#customHelpCategoryInput'), Boolean(selectedHelpCategory.trim()), 'Enter a custom help category.');
    }
    renderCreationCategories();
    openModal('#createGoalOverlay', $('#createHelpBtn') || $('#bottomHelpBtn'));
    goToStep(1);
});

$('#viewMyPendingHelpBtn')?.addEventListener('click', () => {
    const section = $('#myHelpRequestsSection');
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    section?.focus({ preventScroll: true });
});

$('#attachHelpProofBtn')?.addEventListener('click', () => {
    $('#helpProofFile')?.click();
});

$('#attachHelpCreatorQrBtn')?.addEventListener('click', () => {
    $('#helpCreatorQrInput')?.click();
});

$('#helpCreatorQrInput')?.addEventListener('change', async event => {
    const input = event.currentTarget;
    const file = input.files?.[0] || null;
    const name = $('#helpCreatorQrName');
    if (!file) {
        selectedHelpCreatorQrPath = null;
        if (name) name.textContent = 'No QR uploaded yet.';
        return;
    }

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        input.value = '';
        selectedHelpCreatorQrPath = null;
        if (name) name.textContent = 'No QR uploaded yet.';
        showToast('UPI QR must be a PNG, JPG, or WebP image.');
        return;
    }
    if (!file.size || file.size > 2 * 1024 * 1024) {
        input.value = '';
        selectedHelpCreatorQrPath = null;
        if (name) name.textContent = 'No QR uploaded yet.';
        showToast('UPI QR must be under 2 MB.');
        return;
    }
    if (!window.currentUser) {
        input.value = '';
        selectedHelpCreatorQrPath = null;
        if (name) name.textContent = 'Sign in before uploading this QR.';
        showToast('Please sign in before uploading a UPI QR.');
        return;
    }

    const attachButton = $('#attachHelpCreatorQrBtn');
    if (attachButton) attachButton.disabled = true;
    if (name) name.textContent = `Uploading ${file.name}…`;
    try {
        const fileExt = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[file.type];
        const objectPath = `help-creator-qr/${window.currentUser.id}/${crypto.randomUUID()}.${fileExt}`;
        const { data, error } = await sb.storage
            .from(GOAL_PAYMENT_QR_BUCKET)
            .upload(objectPath, file, { contentType: file.type, upsert: false });
        if (error) throw error;

        selectedHelpCreatorQrPath = data.path;
        if (name) name.textContent = `${file.name} · Uploaded`;
        const removeButton = $('#removeHelpCreatorQrBtn');
        if (removeButton) removeButton.style.display = '';
    } catch (error) {
        console.error('Help request UPI QR upload failed:', error);
        selectedHelpCreatorQrPath = null;
        input.value = '';
        if (name) name.textContent = 'Upload failed. Select the file again after Storage is configured.';
        showToast('Unable to upload UPI QR. Check the private Storage bucket and its access policies.');
    } finally {
        if (attachButton) attachButton.disabled = false;
    }
});

$('#removeHelpCreatorQrBtn')?.addEventListener('click', () => {
    selectedHelpCreatorQrPath = null;
    if ($('#helpCreatorQrInput')) $('#helpCreatorQrInput').value = '';
    if ($('#helpCreatorQrName')) $('#helpCreatorQrName').textContent = 'No QR uploaded yet.';
    if ($('#removeHelpCreatorQrBtn')) $('#removeHelpCreatorQrBtn').style.display = 'none';
});

$('#helpProofFile')?.addEventListener('change', async event => {
    const file = event.target.files?.[0] || null;
    const name = $('#helpProofFileName');
    const input = event.target;
    if (!file) {
        selectedHelpProofFile = null;
        selectedHelpProofPath = null;
        if (name) name.textContent = '';
        return;
    }
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedTypes = {
        pdf: ['application/pdf'],
        jpg: ['image/jpeg'],
        jpeg: ['image/jpeg'],
        png: ['image/png'],
        webp: ['image/webp']
    };
    if (!extension || !allowedTypes[extension] || (file.type && !allowedTypes[extension].includes(file.type))) {
        selectedHelpProofFile = null;
        selectedHelpProofPath = null;
        input.value = '';
        if (name) name.textContent = '';
        showToast('Choose a PDF, JPG, PNG, or WebP file.');
        return;
    }
    if (!file.size || file.size > HELP_PROOF_MAX_SIZE) {
        selectedHelpProofFile = null;
        selectedHelpProofPath = null;
        input.value = '';
        if (name) name.textContent = '';
        showToast('Proof files must be 10 MB or smaller.');
        return;
    }

    selectedHelpProofFile = file;
    selectedHelpProofPath = null;
    if (!window.currentUser) {
        if (name) name.textContent = 'Sign in before uploading this file.';
        showToast('Please sign in before attaching a proof document.');
        return;
    }

    if (name) name.textContent = `Uploading ${file.name}…`;
    const attachButton = $('#attachHelpProofBtn');
    if (attachButton) attachButton.disabled = true;
    try {
        const { error: schemaError } = await sb
            .from('help_requests')
            .select('proof_path')
            .limit(0);
        if (schemaError) {
            throw new Error('Help Request proof storage is not configured. Apply the required proof_path database migration first.');
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const objectPath = `${window.currentUser.id}/${crypto.randomUUID()}-${safeName}`;
        const { data, error } = await sb.storage
            .from(HELP_PROOF_BUCKET)
            .upload(objectPath, file, {
                contentType: file.type || allowedTypes[extension][0],
                upsert: false
            });
        if (error) throw error;

        selectedHelpProofPath = data.path;
        if (name) name.textContent = `${file.name} · Uploaded`;
    } catch (error) {
        console.error('Help proof upload failed:', error);
        selectedHelpProofFile = null;
        selectedHelpProofPath = null;
        input.value = '';
        if (name) name.textContent = 'Upload failed. Select the file again after Storage is configured.';
        showToast(error.message?.includes('proof_path')
            ? error.message
            : 'Unable to upload proof. Check the private Storage bucket and its access policies.');
    } finally {
        if (attachButton) attachButton.disabled = false;
    }
});

$$('#creationTypeChoices button').forEach(btn => {
    btn.onclick = () => {
        creationType = btn.dataset.creationType || 'PERSONAL_GOAL';
        goalData.creationType = creationType;
        $$('#creationTypeChoices button').forEach(choice => {
            choice.classList.toggle('selected', choice === btn);
        });
        selectedCreationCategory = creationType === 'HELP_SOMEONE' ? 'education' : 'Birthday';
        renderCreationCategories();
        goToStep(0);
    };
});

$('#creationTypeNext')?.addEventListener('click', () => {
    renderCreationCategories();
    goToStep(1);
});

$('#step1Choices')?.addEventListener('click', event => {
    const button = event.target.closest('button[data-value]');
    if (!button) return;
    selectedCreationCategory = button.dataset.value;
    $$('#step1Choices button').forEach(choice => choice.classList.toggle('selected', choice === button));
    renderCreationCategories();
    if (selectedCreationCategory !== 'custom' && creationType === 'HELP_SOMEONE') {
        setFieldValidation($('#customHelpCategoryInput'), true, '');
    } else if (selectedCreationCategory !== 'Custom' && creationType === 'PERSONAL_GOAL') {
        setFieldValidation($('#customOccasionInput'), true, '');
    }
});

$('#step1Next')?.addEventListener('click', () => {
    if (creationType === 'HELP_SOMEONE') {
        if (selectedCreationCategory === 'custom') {
            const customField = $('#customHelpCategoryInput');
            const customCategory = customField?.value.trim() || '';
            if (!setFieldValidation(customField, Boolean(customCategory), 'Enter a custom help category.')) {
                customField?.focus();
                return;
            }
            selectedHelpCategory = customCategory;
        } else {
            selectedHelpCategory = selectedCreationCategory;
        }
        goalData.helpCategory = selectedHelpCategory;
        openHelpRequestFlow($('#step1Next'));
        return;
    }

    goalData.creationType = 'PERSONAL_GOAL';
    if (selectedCreationCategory === 'Custom') {
        const customField = $('#customOccasionInput');
        const customVal = customField?.value.trim() || '';
        if (!setFieldValidation(customField, Boolean(customVal), 'Enter a custom occasion.')) {
            customField?.focus();
            return;
        }
        goalData.customOccasion = customVal;
        goalData.occasion = customVal;
        goalData.isCustomOccasion = true;
    } else {
        goalData.customOccasion = '';
        goalData.isCustomOccasion = false;
        goalData.occasion = selectedCreationCategory;
    }

    goToStep(editingFromReview ? 6 : 2);
});

// Step 2: Name and description
$('#step2Next')?.addEventListener('click', () => {
    const nameField = $('#goalName');
    const name = nameField?.value.trim() || '';
    const desc = $('#goalDesc')?.value.trim();

    if (!setFieldValidation(nameField, Boolean(name), 'Enter a name for your goal.')) {
        nameField?.focus();
        return;
    }

    goalData.name = name;
    goalData.description = desc;
    goToStep(editingFromReview ? 6 : 3);
});

// Step 3: Target amount and deadline
$('#step3Next')?.addEventListener('click', () => {
    const amountField = $('#goalAmount');
    const deadlineField = $('#goalDeadline');
    const amount = Number(amountField?.value);
    const deadline = deadlineField?.value || '';
    const amountValid = setFieldValidation(amountField, Number.isFinite(amount) && amount >= 100, 'Enter a target amount of at least ₹100.');
    const deadlineValid = setFieldValidation(deadlineField, Boolean(deadline) && deadline >= localDateValue(), 'Choose today or a future deadline.');

    if (!amountValid) {
        amountField?.focus();
        return;
    }

    if (!deadlineValid) {
        deadlineField?.focus();
        return;
    }

    goalData.target = amount;
    goalData.deadline = deadline;
    goToStep(editingFromReview ? 6 : 4);
});

// Step 4: Contribution style; Personal Goals always remain private.
$$('#styleChoices button').forEach(btn => {
    btn.onclick = () => {
        $$('#styleChoices button').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        goalData.style = btn.dataset.value;
    };
});

$('#step4Next')?.addEventListener('click', () => {
    goToStep(editingFromReview ? 6 : 5);
});

$('#attachCreatorQrBtn')?.addEventListener('click', () => $('#creatorQrInput')?.click());

$('#creatorQrInput')?.addEventListener('change', event => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    const name = $('#creatorQrName');
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        showToast('UPI QR must be a PNG, JPG, or WebP image.');
        input.value = '';
        if (name) name.textContent = 'No QR uploaded yet.';
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        showToast('UPI QR must be under 2 MB.');
        input.value = '';
        if (name) name.textContent = 'No QR uploaded yet.';
        return;
    }

    if (name) name.textContent = file.name;
    const removeButton = $('#removeCreatorQrBtn');
    if (removeButton) removeButton.style.display = '';
});

$('#removeCreatorQrBtn')?.addEventListener('click', () => {
    const input = $('#creatorQrInput');
    if (input) input.value = '';
    const name = $('#creatorQrName');
    if (name) name.textContent = 'No QR uploaded yet.';
    const removeButton = $('#removeCreatorQrBtn');
    if (removeButton) removeButton.style.display = 'none';
});

// Step 5: Creator authentication — requires real Google session
$('#step5Next')?.addEventListener('click', () => {
    if (!window.currentUser) {
        // Save current wizard state before OAuth redirect
        sessionStorage.setItem('pendingCreateGoal', JSON.stringify({
            data: goalData
        }));

        sb.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.href }
        });
        return;
    }
    // Update the step-5 preview with the real user
    const name = window.currentUser.user_metadata?.full_name || window.currentUser.email?.split('@')[0] || '';
    const initial = name[0]?.toUpperCase() || '?';
    $$('.google-user-preview .user-avatar-circle').forEach(el => el.textContent = initial);
    $$('.google-user-preview strong').forEach(el => el.textContent = name);
    $$('.google-user-preview small').forEach(el => el.textContent = window.currentUser.email || '');
    $$('#step5Next').forEach(btn => btn.textContent = `Continue as ${name.split(' ')[0]}`);
    goToStep(6);
});

// Step 7: Goal creation — saves to Supabase
$('#finishGoalBtn')?.addEventListener('click', async () => {
    if (!window.currentUser) {
        showToast('Please sign in to create a goal.');
        return;
    }

    const btn = $('#finishGoalBtn');
    btn.disabled = true;
    btn.textContent = 'Creating…';

    const creatorUpiId = ($('#creatorUpiId')?.value || '').trim();
    const creatorQrFile = $('#creatorQrInput')?.files?.[0] || null;
    let creatorQrPath = null;

    if (creatorQrFile) {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
        if (!allowedTypes.includes(creatorQrFile.type)) {
            showToast('UPI QR must be a PNG, JPG, or WebP image.');
            btn.disabled = false;
            btn.textContent = 'Create SharedGoal';
            return;
        }
        if (!creatorQrFile.size || creatorQrFile.size > 2 * 1024 * 1024) {
            showToast('UPI QR must be under 2 MB.');
            btn.disabled = false;
            btn.textContent = 'Create SharedGoal';
            return;
        }

        const qrBucket = GOAL_PAYMENT_QR_BUCKET;
        const fileExt = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[creatorQrFile.type];
        const uploadPath = `creator-qr/${window.currentUser.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await sb.storage.from(qrBucket).upload(uploadPath, creatorQrFile, {
            upsert: false,
            contentType: creatorQrFile.type
        });

        if (uploadError) {
            console.error('QR upload failed:', uploadError);
            showToast('Failed to upload your UPI QR image. Please try again.');
            btn.disabled = false;
            btn.textContent = 'Create SharedGoal';
            return;
        }

        creatorQrPath = uploadPath;
    }

    const { data: goal, error } = await sb
        .from('goals')
        .insert({
            creator_id: window.currentUser.id,
            name: goalData.name,
            occasion: goalData.occasion,
            description: goalData.description,
            target_amount: goalData.target,
            deadline: goalData.deadline,
            is_private: true,
            status: 'Active',
            creator_upi_id: creatorUpiId || null,
            creator_qr_path: creatorQrPath
        })
        .select('id')
        .single();

    if (error) {
        showToast('Failed to create goal. Please try again.');
        btn.disabled = false;
        btn.textContent = 'Create SharedGoal';
        return;
    }
    activeGoalId = String(goal.id);
    try {
        localStorage.setItem(`sharedGoalContributionStyle:${goal.id}`, goalData.style);
    } catch (storageError) {
        console.warn('Unable to save the contribution style in this browser:', storageError);
    }

    // Clear the pending OAuth resume state now that creation succeeded
    sessionStorage.removeItem('pendingCreateGoal');

    // Add creator as member
    await sb.from('goal_members').insert({
        goal_id: goal.id,
        user_id: window.currentUser.id,
        role: 'Creator'
    });

    // Create/store invitations for private goals
    // Create general invite for the copy link UI
    const { data: generalInvite } = await sb.from('goal_invites').insert({
        goal_id: goal.id,
        email: null,
        status: 'Pending'
    }).select('token').single();

    if (generalInvite) {
        const goalUrl = window.location.origin + '/my-goals.html?invite=' + generalInvite.token;
        sessionStorage.setItem('sharedGoalCreatedLink', goalUrl);
        $$('.copy-link-box span').forEach(el => el.textContent = goalUrl);
    }

    showToast('🎉 SharedGoal created successfully!');
    if ($('#creatorQrInput')) $('#creatorQrInput').value = '';
    if ($('#creatorQrName')) $('#creatorQrName').textContent = 'No QR uploaded yet.';
    if ($('#removeCreatorQrBtn')) $('#removeCreatorQrBtn').style.display = 'none';
    btn.disabled = false;
    btn.textContent = 'Create SharedGoal';
    closeModal();

    setTimeout(() => {
        if (!window.location.pathname.includes('my-goals.html')) {
            window.location.href = `my-goals.html?goal=${encodeURIComponent(goal.id)}`;
        } else {
            const url = new URL(window.location.href);
            url.searchParams.set('goal', goal.id);
            window.history.replaceState({}, '', url);
            loadMyGoals(goal.id);
        }
    }, 700);
});

$$('.step-back-btn').forEach(btn => {
    btn.onclick = () => {
        if (currentStep === 1) {
            if (entryContext === 'HOME') goToStep(0);
            else closeModal();
        } else if (currentStep > 1) {
            goToStep(currentStep - 1);
        } else {
            closeModal();
        }
    };
});

// Quick contribution flow
let currentContributeGoalId = null;
let currentContributeHelpId = null;

async function openHelpContribution(helpId, title, triggerElement = null) {
    if (!helpId) {
        showToast('This Help Someone request is unavailable.');
        return;
    }
    if (!authResolved) await authReady;
    if (!authResolved) {
        showToast('Unable to verify your sign-in status. Please try again.');
        return;
    }
    if (!window.currentUser) {
        sessionStorage.setItem(PENDING_HELP_CONTRIBUTION_KEY, JSON.stringify({
            requestId: String(helpId),
            title: title || 'Help Someone'
        }));
        showToast('Please sign in to contribute.');
        openModal('#loginOverlay', triggerElement);
        return;
    }

    currentContributeGoalId = null;
    currentContributeHelpId = String(helpId);
    currentContributeSplitStyle = 'Custom amounts';
    currentContributeFixedAmount = null;
    currentContributeRemaining = null;
    const amountInput = $('#contributionAmount');
    if (amountInput) {
        amountInput.readOnly = false;
        amountInput.removeAttribute('max');
        amountInput.value = '1000';
    }
    $$('.quick button').forEach(button => {
        button.disabled = false;
    });

    setContributionPaymentDetails('', '', 'request owner');
    const { data: request, error: requestError } = await sb
        .from('help_requests')
        .select('creator_upi_id, creator_qr_path')
        .eq('id', helpId)
        .maybeSingle();
    if (requestError) {
        console.error('Unable to load Help Someone payment details:', requestError);
    } else if (request) {
        setContributionPaymentDetails(request.creator_upi_id, request.creator_qr_path, 'request owner');
    }

    const titleElement = $('#contributionGoal');
    if (titleElement) titleElement.textContent = title || 'Help Someone';
    openModal('#contributionOverlay', triggerElement);
}

async function restorePendingHelpContribution(requests) {
    if (!window.currentUser) return;
    const saved = sessionStorage.getItem(PENDING_HELP_CONTRIBUTION_KEY);
    if (!saved) return;

    try {
        const pending = JSON.parse(saved);
        const request = requests.find(row => String(row.id) === String(pending.requestId));
        if (!request) {
            sessionStorage.removeItem(PENDING_HELP_CONTRIBUTION_KEY);
            showToast('That Help Someone request is no longer available to contribute to.');
            return;
        }
        sessionStorage.removeItem(PENDING_HELP_CONTRIBUTION_KEY);
        await openHelpContribution(request.id, request.title);
    } catch (error) {
        console.error('Unable to restore the Help Someone contribution:', error);
        sessionStorage.removeItem(PENDING_HELP_CONTRIBUTION_KEY);
        showToast('Unable to reopen that contribution. Please select the request again.');
    }
}

$$('[data-contribute]').forEach(btn => {
    btn.onclick = () => {
        currentContributeGoalId = btn.dataset.contributeId || null;
        currentContributeHelpId = btn.dataset.helpId || null;
        if (currentContributeHelpId) {
            openHelpContribution(currentContributeHelpId, btn.dataset.contribute || 'Help Someone', btn);
            return;
        }
        if (currentContributeGoalId && window.currentDashboardGoal) {
            configureGoalContribution(window.currentDashboardGoal);
        } else {
            currentContributeSplitStyle = 'Custom amounts';
            currentContributeFixedAmount = null;
            currentContributeRemaining = null;
            const input = $('#contributionAmount');
            if (input) {
                input.readOnly = false;
                input.removeAttribute('max');
                input.value = '1000';
            }
            $$('.quick button').forEach(quickButton => {
                quickButton.disabled = false;
            });
        }
        const titleEl = $('#contributionGoal');
        if (titleEl) titleEl.textContent = btn.dataset.contribute || 'Goal';
        openModal('#contributionOverlay', btn);
    };
});

$$('.quick button').forEach(btn => {
    btn.onclick = () => {
        const input = $('#contributionAmount');
        if (input && !input.readOnly) input.value = btn.dataset.amount;
        refreshContributionPaymentDetails();
    };
});

$('#contributionAmount')?.addEventListener('input', refreshContributionPaymentDetails);

$$('.payments button').forEach(btn => {
    btn.onclick = () => {
        $$('.payments button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        refreshContributionPaymentDetails();
    };
});

$('#makeContributionBtn')?.addEventListener('click', async () => {
    if (currentContributeHelpId) {
        if (!authResolved) await authReady;
        if (!authResolved) {
            showToast('Unable to verify your sign-in status. Please try again.');
            return;
        }
        if (!window.currentUser) {
            const pendingHelpId = currentContributeHelpId;
            const pendingHelpTitle = $('#contributionGoal')?.textContent || 'Help Someone';
            sessionStorage.setItem(PENDING_HELP_CONTRIBUTION_KEY, JSON.stringify({
                requestId: String(pendingHelpId),
                title: pendingHelpTitle
            }));
            openModal('#loginOverlay', $('#makeContributionBtn'));
            showToast('Please sign in to contribute.');
            return;
        }
    }

    const amount = Number($('#contributionAmount')?.value);
    if (!amount || amount <= 0 || !Number.isFinite(amount)) {
        showToast('Please enter a valid numeric contribution amount.');
        return;
    }
    if (currentContributeGoalId && currentContributeSplitStyle === 'Equal split' && amount !== currentContributeFixedAmount) {
        showToast('This goal uses an assigned Equal Split contribution amount.');
        return;
    }
    if (currentContributeGoalId && currentContributeSplitStyle !== 'Equal split' && amount > currentContributeRemaining) {
        showToast(`Contribution cannot exceed the remaining goal amount of ₹${Number(currentContributeRemaining).toLocaleString('en-IN')}.`);
        return;
    }

    const paymentMethod = $('.payments button.active')?.textContent?.trim() || 'UPI';

    if (!window.currentUser || (!currentContributeGoalId && !currentContributeHelpId)) {
        showToast(`₹${amount.toLocaleString('en-IN')} contribution recorded via ${paymentMethod}.`);
        closeModal();
        currentContributeHelpId = null;
        currentContributeGoalId = null;
        currentContributeSplitStyle = 'Custom amounts';
        currentContributeFixedAmount = null;
        currentContributeRemaining = null;
        return;
    }

    const btn = $('#makeContributionBtn');
    btn.disabled = true;

    if (currentContributeHelpId) {
        const { error } = await sb.rpc('submit_help_contribution', {
            target_help_id: Number(currentContributeHelpId),
            contribution_amount: Number(amount),
            contribution_method: paymentMethod
        });

        if (error) {
            console.error('Help contribution:', error);
            showToast('Failed to submit contribution. Please try again.');
            btn.disabled = false;
            return;
        }
    } else if (currentContributeGoalId) {
        const { error } = await sb.from('contributions').insert({
            goal_id: currentContributeGoalId,
            user_id: window.currentUser.id,
            amount,
            payment_method: paymentMethod,
            status: 'Pending'
        });

        if (error) {
            showToast('Failed to record contribution. Please try again.');
            btn.disabled = false;
            return;
        }
    }

    btn.disabled = false;

    if (currentContributeHelpId) {
        showToast(`₹${amount.toLocaleString('en-IN')} contribution submitted via ${paymentMethod}.`);
    } else {
        showToast(`₹${amount.toLocaleString('en-IN')} contribution submitted via ${paymentMethod}. Pending confirmation.`);
    }

    currentContributeHelpId = null;
    currentContributeGoalId = null;

    closeModal();
    if ($('#mainGoalTitle')) loadMyGoals();
});

// My Goals — goal display
const categoryImages = {
    birthday: 'assets/images/occasion-01-birthday.png',
    wedding: 'assets/images/occasion-02-wedding.png',
    trip: 'assets/images/occasion-03-trip.png',
    farewell: 'assets/images/occasion-04-farewell.png',
    'college event': 'assets/images/occasion-05-college-event.png',
    festival: 'assets/images/occasion-06-festival.png',
    education: 'assets/images/help-01-education.png',
    medical: 'assets/images/help-02-medical.png',
    'medical help': 'assets/images/help-02-medical.png',
    'basic needs': 'assets/images/help-04-basic.png',
    assistance: 'assets/images/help-03-assistance.png',
    'assistance & relief': 'assets/images/help-03-assistance.png',
    charity: 'assets/images/help-03-assistance.png',
    'help someone': 'assets/images/help-03-assistance.png',
    'charity / help someone': 'assets/images/help-03-assistance.png'
};

function setDashboardSectionError(container, message) {
    if (!container) return;
    container.replaceChildren();
    const text = document.createElement('p');
    text.style.cssText = 'color: var(--text-secondary); font-size: 14px;';
    text.textContent = message;
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'text-link';
    retry.textContent = 'Retry';
    retry.addEventListener('click', () => loadMyGoals(activeGoalId));
    container.append(text, retry);
}

function showGoalData(g) {
    const setText = (id, val) => { const el = $(id); if (el) el.textContent = val; };
    const collectionUnavailable = Boolean(g.rawGoal?.sectionErrors?.contributions);
    const membersUnavailable = Boolean(g.rawGoal?.sectionErrors?.members);
    setText('#mainGoalTitle', g.title);
    setText('#mainGoalOccasion', g.occasion);
    setText('#mainGoalDesc', g.description);
    setText('#mainGoalCollected', collectionUnavailable ? '—' : '₹' + g.collected.toLocaleString('en-IN'));
    setText('#mainGoalTarget', ' of ₹' + g.target.toLocaleString('en-IN'));
    setText('#mainGoalPercent', collectionUnavailable ? 'Unavailable' : g.percent + '% collected');
    setText('#mainGoalDays', g.daysLeft > 0 ? `${g.daysLeft} days left` : 'Completed');
    setText('#mainGoalMembers', membersUnavailable ? 'Members unavailable' : `${g.members} members`);
    setText('#yourContribAmount', collectionUnavailable ? '—' : '₹' + g.userContrib.toLocaleString('en-IN'));

    const img = $('#mainGoalImg');
    if (img) img.src = g.image;
    const bar = $('#mainGoalBar');
    if (bar) bar.style.width = collectionUnavailable ? '0%' : g.percent + '%';

    // The logged-out dashboard intentionally uses the built-in demo goal.
    if (!g.rawGoal) {
        setText('#yourContribBadge', 'Demo');
        setText('#yourContribDetail', 'Sign in to view your contribution.');
        setText('#memberCountBadge', 'Demo');
        setText('#membersListContainer', '');
        if ($('#membersAvatarRow')) $('#membersAvatarRow').replaceChildren();
        $('#membersListContainer')?.insertAdjacentText('afterbegin', 'Sign in to view goal members.');
        setText('#contribCountBadge', 'Demo');
        setText('#contribListContainer', '');
        $('#contribListContainer')?.insertAdjacentText('afterbegin', 'Sign in to view contributions.');
        setText('#giftItemsList', '');
        $('#giftItemsList')?.insertAdjacentText('afterbegin', 'Sign in to view gift ideas.');
        setText('#groupDecisionContainer', '');
        $('#groupDecisionContainer')?.insertAdjacentText('afterbegin', 'Sign in to view group decisions.');
        setText('#activityTimelineContainer', '');
        $('#activityTimelineContainer')?.insertAdjacentText('afterbegin', 'Sign in to view activity.');
        if ($('#goalOutcomeStatus')) {
            $('#goalOutcomeStatus').textContent = 'Sign in to view goal outcome details.';
            $('#goalOutcomeStatus').style.display = 'block';
        }
        return;
    }

    // Dashboard Integration
    activeGoalId = String(g.goalId || g.id);
    window.currentDashboardGoal = g;

    // 2. Your Contribution
    const hasContrib = g.userContrib > 0;
    const contributionError = g.rawGoal.sectionErrors?.contributions;
    setText('#yourContribBadge', contributionError ? 'Unavailable' : hasContrib ? 'Confirmed' : '—');
    const badgeEl = $('#yourContribBadge');
    if (badgeEl) badgeEl.className = !contributionError && hasContrib ? 'status-badge confirmed' : 'status-badge';
    setText('#yourContribDetail', contributionError
        ? 'Unable to load contribution details.'
        : hasContrib ? 'Thanks for being part of this goal!' : 'No contribution yet.');
    const contribBtn = $('#addContribBtn');
    if (contribBtn) {
        contribBtn.dataset.contributeId = g.id;
        contribBtn.dataset.contribute = g.title;
        // ensure event listener runs
        contribBtn.onclick = () => {
            currentContributeGoalId = g.id;
            configureGoalContribution(g);
            const titleEl = $('#contributionGoal');
            if (titleEl) titleEl.textContent = g.title;
            openModal('#contributionOverlay', contribBtn);
        };
    }

    // 3. Members
    setText('#memberCountBadge', g.rawGoal.sectionErrors?.members ? 'Unavailable' : `${g.members} people`);
    const membersRow = $('#membersAvatarRow');
    const membersList = $('#membersListContainer');
    if (membersRow && membersList) {
        membersRow.innerHTML = '';
        membersList.innerHTML = '';
        const members = g.rawGoal.goal_members || [];

        if (g.rawGoal.sectionErrors?.members) {
            setDashboardSectionError(membersList, 'Unable to load members.');
        } else {
            members.slice(0, 4).forEach(m => {
                const initial = m.profiles?.name ? m.profiles.name.charAt(0).toUpperCase() : '?';
                membersRow.innerHTML += `<i>${initial}</i>`;
            });
            if (members.length > 4) {
                membersRow.innerHTML += `<i class="more">+${members.length - 4}</i>`;
            }

            if (members.length === 0) {
                membersList.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">No members yet.</p>';
            } else {
                members.forEach(m => {
                    const name = m.profiles?.name || 'Unknown';
                    membersList.innerHTML += `
                        <div class="member-item">
                            <div class="member-info">
                                <strong>${name}</strong>
                            </div>
                            <span class="member-role">${m.role}</span>
                        </div>
                    `;
                });
            }
        }
    }

    // 4. Contributions
    const contribs = g.rawGoal.contributions || [];
    const confirmedCount = contribs.filter(c => c.status === 'Confirmed').length;
    setText('#contribCountBadge', contributionError ? 'Unavailable' : confirmedCount > 0 ? `${confirmedCount} Confirmed` : '—');
    const cBadgeEl = $('#contribCountBadge');
    if (cBadgeEl) cBadgeEl.className = confirmedCount > 0 ? 'status-badge confirmed' : 'status-badge';

    const contribList = $('#contribListContainer');
    if (contribList) {
        contribList.innerHTML = '';
        if (contributionError) {
            setDashboardSectionError(contribList, 'Unable to load contributions.');
        } else if (contribs.length === 0) {
            contribList.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">No contributions yet.</p>';
        } else {
            const isCreatorForContribs = g.rawGoal.creator_id === window.currentUser?.id;

            contribs.forEach(c => {
                const name = c.profiles?.name || 'Unknown';
                const dateStr = new Date(c.created_at).toLocaleDateString();
                const methodStr = c.payment_method || 'Unknown';
                
                let confirmHtml = '';
                if (c.status === 'Pending' && isCreatorForContribs) {
                    confirmHtml = `<div style="margin-top: 0.5rem;"><button class="btn small" data-confirm-goal-contribution="${c.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Confirm</button></div>`;
                }

                contribList.innerHTML += `
                    <div class="row-item" style="${confirmHtml ? 'align-items: flex-start;' : ''}">
                        <div style="flex: 1;">
                            <strong>${name}</strong>
                            <small style="${confirmHtml ? 'display: block; margin-bottom: 0.25rem;' : ''}">${methodStr} · ${dateStr}</small>
                            ${confirmHtml}
                        </div>
                        <span class="amount-cell" ${c.status === 'Pending' ? 'style="color: var(--amber);"' : ''}>₹${Number(c.amount).toLocaleString('en-IN')}</span>
                    </div>
                `;
            });

            $$('[data-confirm-goal-contribution]').forEach(btn => {
                btn.onclick = async () => {
                    btn.disabled = true;
                    btn.textContent = 'Confirming...';
                    const contributionId = btn.dataset.confirmGoalContribution;
                    
                    const { data, error } = await sb
                        .from('contributions')
                        .update({ status: 'Confirmed' })
                        .eq('id', Number(contributionId))
                        .select();

                    if (error || !data || data.length === 0) {
                        console.error('Confirm goal contribution:', error || 'No rows updated (RLS block).');
                        showToast('Failed to confirm contribution. Please try again.');
                        btn.disabled = false;
                        btn.textContent = 'Confirm';
                        return;
                    }

                    showToast('Contribution confirmed successfully.');
                    
                    // Optimistically update the UI without losing tab state
                    const targetC = g.rawGoal.contributions.find(c => c.id === Number(contributionId));
                    if (targetC) {
                        targetC.status = 'Confirmed';
                        const confirmed = g.rawGoal.contributions.filter(c => c.status === 'Confirmed');
                        g.collected = confirmed.reduce((s, c) => s + Number(c.amount), 0);
                        g.percent = Math.min(100, Math.round((g.collected / g.target) * 100)) || 0;
                        if (targetC.user_id === window.currentUser?.id) {
                            g.userContrib += Number(targetC.amount);
                        }
                        showGoalData(g);
                    }
                };
            });
        }
    }

    // 7. Activity Timeline
    const timeline = $('#activityTimelineContainer');
    if (timeline) {
        timeline.innerHTML = '';
        if (g.rawGoal.sectionErrors?.contributions || g.rawGoal.sectionErrors?.members) {
            setDashboardSectionError(timeline, 'Unable to load activity.');
        } else {
            const events = [];
            events.push({ text: `Goal created`, sub: new Date(g.rawGoal.created_at).toLocaleDateString(), date: new Date(g.rawGoal.created_at) });

            contribs.forEach(c => {
                const name = c.profiles?.name || 'Someone';
                events.push({
                    text: `${name} contributed ₹${Number(c.amount).toLocaleString('en-IN')}`,
                    sub: `${new Date(c.created_at).toLocaleDateString()} via ${c.payment_method || 'Unknown'}`,
                    date: new Date(c.created_at)
                });
            });

            const members = g.rawGoal.goal_members || [];
            members.forEach(m => {
                if (m.role !== 'Creator') {
                    const name = m.profiles?.name || 'Someone';
                    events.push({
                        text: `${name} joined the goal`,
                        sub: new Date(m.joined_at).toLocaleDateString(),
                        date: new Date(m.joined_at)
                    });
                }
            });

            events.sort((a, b) => b.date - a.date);

            if (events.length === 0) {
                timeline.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">No activity yet.</p>';
            } else {
                events.forEach(e => {
                    timeline.innerHTML += `
                        <div class="row-item">
                            <div>
                                <strong>${e.text}</strong>
                                <small>${e.sub}</small>
                            </div>
                        </div>
                    `;
                });
            }
        }
    }

    // 8. Spending
    setText('#spendingCollected', contributionError ? '—' : '₹' + g.collected.toLocaleString('en-IN'));
    const outcomeStatus = $('#goalOutcomeStatus');
    if (outcomeStatus) {
        if (contributionError) {
            outcomeStatus.style.display = 'block';
            setDashboardSectionError(outcomeStatus, 'Unable to load goal outcome totals.');
        } else {
            outcomeStatus.replaceChildren();
            outcomeStatus.style.display = 'none';
        }
    }

    // 9. Complete Goal overlay — show real collected amount
    setText('#completeGoalCollected', '₹' + g.collected.toLocaleString('en-IN'));
    const expendInput = $('#completeGoalOverlay input[type="number"]');
    if (expendInput) expendInput.value = g.collected;

    // 10. Share Invite / Copy Goal Link button
    const copyGoalLinkBtn = $('#copyGoalLinkBtn');
    const inviteMoreMembersBtn = $('#inviteMoreMembersBtn');

    const currentUserRole = g.rawGoal.goal_members?.find(m => m.user_id === window.currentUser?.id)?.role;
    const canShareInvite = currentUserRole === 'Creator';

    if (copyGoalLinkBtn) {
        copyGoalLinkBtn.style.display = canShareInvite ? '' : 'none';
    }
    if (inviteMoreMembersBtn) {
        inviteMoreMembersBtn.style.display = canShareInvite ? '' : 'none';
    }

    const handleShareClick = async (showInModal = false) => {
        if (!canShareInvite) return;

        if (showInModal) {
            openModal('#inviteMemberOverlay');
            $('#dashboardInviteLinkText').textContent = 'Generating link...';
            $('#copyDashboardInviteLinkBtn').disabled = true;
        }

        let shareUrl = window.location.origin + '/my-goals.html';

        const payload = {
            goal_id: g.goalId,
            email: '',
            invited_by: window.currentUser?.id,
            status: 'Pending'
        };
        const { data, error } = await sb.from('goal_invites').insert(payload).select('token').single();

        if (error) console.error('Share Goal API Error:', error);

        if (!error && data) {
            shareUrl = window.location.origin + '/my-goals.html?invite=' + data.token;
        } else {
            if (showInModal) $('#dashboardInviteLinkText').textContent = 'Failed to generate link.';
            else showToast('Failed to generate invite link.');
            return;
        }

        if (showInModal) {
            $('#dashboardInviteLinkText').textContent = shareUrl;
            $('#copyDashboardInviteLinkBtn').disabled = false;
            $('#copyDashboardInviteLinkBtn').onclick = () => {
                navigator.clipboard?.writeText(shareUrl);
                showToast('Goal invitation link copied to clipboard!');
            };
        } else {
            navigator.clipboard?.writeText(shareUrl);
            showToast(g.rawGoal.is_private ? 'Private invite link copied to clipboard!' : 'Goal invite link copied to clipboard!');
        }
    };

    if (copyGoalLinkBtn && g.goalId) {
        copyGoalLinkBtn.onclick = () => handleShareClick(false);
    }
    if (inviteMoreMembersBtn && g.goalId) {
        inviteMoreMembersBtn.onclick = () => handleShareClick(true);
    }

    // 11. Contribute button — set real goal id
    $$('[data-contribute]').forEach(btn => {
        if (!btn.closest('#createGoalOverlay')) {
            btn.dataset.contributeId = g.goalId;
            btn.dataset.contribute = g.title;
        }
    });

    // 12. Group Decision (Gift Suggestions & Voting)
    const suggestions = g.rawGoal.gift_suggestions || [];
    const members = g.rawGoal.goal_members || [];
    const memberCount = members.length || 1;
    const isCreator = members.some(m => m.user_id === window.currentUser?.id && m.role === 'Creator');

    const selectedGift = suggestions.find(s => s.is_selected);

    userSuggestionsCount = suggestions.filter(s => s.user_id === window.currentUser?.id).length;
    userVotesCount = suggestions.reduce((total, s) => {
        const v = s.gift_votes || [];
        return total + (v.some(vote => vote.user_id === window.currentUser?.id) ? 1 : 0);
    }, 0);

    const giftList = $('#giftItemsList');
    if (giftList) {
        giftList.innerHTML = '';
        if (g.rawGoal.sectionErrors?.gifts) {
            setDashboardSectionError(giftList, 'Unable to load gift ideas.');
        } else if (selectedGift) {
            const member = members.find(m => m.user_id === selectedGift.user_id);
            const name = member?.profiles?.name || 'Someone';
            const linkStr = selectedGift.link ? `<a href="${selectedGift.link}" target="_blank" rel="noopener noreferrer" style="color: var(--teal); text-decoration: underline;">(Link)</a>` : '';
            giftList.innerHTML = `
                <div class="gift-item" style="border: 2px solid var(--teal); background: rgba(56, 178, 172, 0.05);">
                    <div>
                        <strong style="color: var(--teal);">🎉 Final Decision: ${selectedGift.name}</strong>
                        <small style="display: block; color: var(--muted);">₹${Number(selectedGift.price).toLocaleString('en-IN')} · Suggested by ${name} ${linkStr}</small>
                    </div>
                </div>
            `;
        } else if (suggestions.length === 0) {
            giftList.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">No suggestions yet.</p>';
        } else {
            suggestions.sort((a, b) => (b.gift_votes || []).length - (a.gift_votes || []).length).forEach(s => {
                const member = members.find(m => m.user_id === s.user_id);
                const name = member?.profiles?.name || 'Someone';
                const votes = s.gift_votes || [];
                const isVoted = votes.some(v => v.user_id === window.currentUser?.id);
                const voteCount = votes.length;
                const percent = Math.round((voteCount / memberCount) * 100);
                const linkStr = s.link ? `<a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color: var(--teal); text-decoration: underline;">(Link)</a>` : '';

                const item = document.createElement('div');
                item.className = 'gift-item';

                let actionHTML = `
                    <button class="gift-vote-btn ${isVoted ? 'voted' : ''}" data-id="${s.id}" aria-label="Vote for ${s.name}">
                        👍 <span class="vote-count">${voteCount}</span>
                    </button>
                `;

                if (percent >= 60 && isCreator) {
                    actionHTML += `
                        <button class="finalize-gift-btn" data-id="${s.id}" style="margin-left: 10px; background: var(--teal); color: white; border: none; padding: 4px 10px; border-radius: 4px; font-weight: 500; font-size: 13px; cursor: pointer;">
                            Finalize
                        </button>
                    `;
                }

                item.innerHTML = `
                    <div>
                        <strong>🎁 ${s.name}</strong>
                        <small style="display: block; color: var(--muted);">₹${Number(s.price).toLocaleString('en-IN')} · Suggested by ${name} ${linkStr}</small>
                        <small style="display: block; color: var(--teal); font-weight: 600; margin-top: 4px;">${percent}% of members voted (${voteCount}/${memberCount})</small>
                    </div>
                    <div style="display: flex; align-items: center;">
                        ${actionHTML}
                    </div>
                `;
                giftList.appendChild(item);

                const voteBtn = item.querySelector('.gift-vote-btn');
                if (voteBtn) bindGiftVoteBtn(voteBtn);

                const finalizeBtn = item.querySelector('.finalize-gift-btn');
                if (finalizeBtn) bindFinalizeGiftBtn(finalizeBtn);
            });
        }
    }

    const groupDecisionContainer = $('#groupDecisionContainer');
    if (groupDecisionContainer) {
        if (g.rawGoal.sectionErrors?.gifts) {
            setDashboardSectionError(groupDecisionContainer, 'Unable to load group decisions.');
        } else if (selectedGift) {
            const votes = selectedGift.gift_votes || [];
            const percent = Math.round((votes.length / memberCount) * 100);
            groupDecisionContainer.innerHTML = `
                <div style="margin-top: 8px;">
                    <strong style="display: block; font-size: 16px; margin-bottom: 12px; color: var(--teal);">Decision Finalized ✓</strong>
                    <div style="font-size: 15px; font-weight: 500; margin-bottom: 2px;">${selectedGift.name}</div>
                    <div style="color: var(--teal); font-weight: 600; margin-bottom: 12px;">₹${Number(selectedGift.price).toLocaleString('en-IN')}</div>
                    <small style="display: block; color: var(--text-secondary); margin-bottom: 2px;">${percent}% member approval</small>
                    <small style="display: block; color: var(--text-secondary);">Finalized by Creator</small>
                </div>
            `;
        } else {
            groupDecisionContainer.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">No group decisions yet.</p>';
        }
    }

    const suggestBtn = $('#openSuggestGiftBtn');
    if (suggestBtn) {
        if (selectedGift) {
            suggestBtn.style.display = 'none';
        } else {
            suggestBtn.style.display = '';
            if (userSuggestionsCount >= MAX_SUGGESTIONS) {
                suggestBtn.textContent = 'Suggestion limit reached (2 of 2 used)';
            } else {
                suggestBtn.textContent = '+ Suggest Gift Idea';
            }
        }
    }
}

// Demo goals — shown when user is not signed in
const sampleGoals = {
    aarav: {
        title: "Aarav's Birthday Gift",
        occasion: "🎂 Birthday · Active · Private",
        image: "assets/images/occasion-01-birthday.png",
        description: "Let's get Aarav something he'll actually love — Sony WH-1000XM5 headphones with travel case.",
        collected: 18500, target: 25000, percent: 74, daysLeft: 12, members: 6, userContrib: 3000
    },
    goa: {
        title: "Goa Weekend Getaway",
        occasion: "✈️ Trip · Active · Private",
        image: "assets/images/hero-01.png",
        description: "Villa rental, scooty rentals and sunset dinner for our college reunion gang.",
        collected: 32000, target: 40000, percent: 80, daysLeft: 19, members: 8, userContrib: 5000
    },
    farewell: {
        title: "Farewell Gift for Maya",
        occasion: "🎉 Farewell · Completed · Private",
        image: "assets/images/help-03-assistance.png",
        description: "Custom engraved Kindle Oasis and leather sleeve for Maya's new chapter in London.",
        collected: 16500, target: 15000, percent: 100, daysLeft: 0, members: 9, userContrib: 2000
    }
};
const demoGoalPreview = JSON.parse(JSON.stringify(sampleGoals));

function setGoalsPageState(mode, message = '') {
    const loadingEl = $('#goalsLoadingState');
    const emptyEl = $('#goalsEmptyState');
    const errorEl = $('#goalsErrorState');
    const contentEl = $('#goalsContent');

    [loadingEl, emptyEl, errorEl, contentEl].forEach(el => {
        if (el) el.style.display = 'none';
    });

    if (mode === 'loading' && loadingEl) {
        const title = loadingEl.querySelector('h2');
        if (title) title.textContent = message || 'Loading your goals...';
        loadingEl.style.display = 'flex';
        return;
    }

    if (mode === 'empty' && emptyEl) {
        const title = emptyEl.querySelector('h2');
        const text = emptyEl.querySelector('p');
        if (title) title.textContent = 'No goals yet';
        if (text) text.textContent = "You haven't created or joined any goals yet. Create your first goal.";
        emptyEl.style.display = 'flex';
        return;
    }

    if (mode === 'error' && errorEl) {
        const title = errorEl.querySelector('h2');
        const text = errorEl.querySelector('p');
        const retry = errorEl.querySelector('button');
        if (title) title.textContent = 'Unable to load your goals';
        if (text) text.textContent = message || 'Something went wrong while loading your goals.';
        if (retry) retry.onclick = () => authResolved ? loadMyGoals() : initializeApp();
        errorEl.style.display = 'flex';
        return;
    }

    if (contentEl) contentEl.style.display = 'block';
}

function updateGoalsEmptyState() {
    if (!window.currentUser) return;
    const hasGoals = Object.keys(sampleGoals).length > 0;
    if (hasGoals) {
        setGoalsPageState('content');
    } else {
        setGoalsPageState('empty');
    }
}

function renderLoggedOutGoals() {
    if (!$('#goalsContent')) return;
    goalsLoadVersion++;
    Object.keys(sampleGoals).forEach(key => delete sampleGoals[key]);
    Object.assign(sampleGoals, JSON.parse(JSON.stringify(demoGoalPreview)));
    activeGoalId = null;
    window.currentDashboardGoal = null;
    const tabs = $('.goal-tabs');
    if (tabs) {
        const createButton = tabs.querySelector('[data-create]');
        tabs.replaceChildren();
        if (createButton) tabs.appendChild(createButton);
    }
    setGoalsPageState('content');
    showGoalData(sampleGoals.aarav);
}

function bindGoalTabs() {
    $$('.goal-tabs button[data-goal]').forEach(btn => {
        btn.onclick = () => {
            const g = sampleGoals[btn.dataset.goal];
            if (!g) return;
            $$('.goal-tabs button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeGoalId = String(g.goalId);
            showGoalData(g);
        };
    });
}
bindGoalTabs();

// Load real goals from Supabase
let goalsLoadVersion = 0;
async function loadMyGoals(preferredGoalId = null) {
    if (!authResolved) return;
    if (!window.currentUser) {
        renderLoggedOutGoals();
        return;
    }

    const loadVersion = ++goalsLoadVersion;
    const userId = window.currentUser.id;
    const requestedGoalId = preferredGoalId
        || new URLSearchParams(window.location.search).get('goal')
        || activeGoalId;
    setGoalsPageState('loading', 'Loading your goals...');

    try {
        const { data: memberRows, error: memberError } = await sb
            .from('goal_members')
            .select('goal_id')
            .eq('user_id', userId);

        if (loadVersion !== goalsLoadVersion || window.currentUser?.id !== userId) return;
        if (memberError) throw memberError;

        const goalIds = [...new Set([
            ...(memberRows || []).map(r => r.goal_id),
            ...(preferredGoalId ? [preferredGoalId] : [])
        ])];

        if (!goalIds.length) {
            Object.keys(sampleGoals).forEach(k => delete sampleGoals[k]);
            activeGoalId = null;
            setGoalsPageState('empty');
            loadMyHelpRequests();
            return;
        }

        const { data: rows, error } = await sb
            .from('goals')
            .select(`
                id, name, occasion, description, target_amount, deadline, is_private, status, created_at, creator_id, creator_upi_id, creator_qr_path
            `)
            .in('id', goalIds)
            .in('status', ['Active', 'Completed', 'Closed', 'Expired']);

        if (loadVersion !== goalsLoadVersion || window.currentUser?.id !== userId) return;
        if (error) throw error;
        if (!rows?.length) {
            Object.keys(sampleGoals).forEach(k => delete sampleGoals[k]);
            activeGoalId = null;
            setGoalsPageState('empty');
            loadMyHelpRequests();
            return;
        }

        const querySection = async query => {
            try {
                return await query;
            } catch (sectionError) {
                return { data: null, error: sectionError };
            }
        };
        const [membersResult, contributionsResult, giftsResult] = await Promise.all([
            querySection(sb.from('goal_members')
                .select('goal_id, user_id, role, joined_at, profiles(name, avatar_url)')
                .in('goal_id', goalIds)),
            querySection(sb.from('contributions')
                .select('id, goal_id, amount, status, user_id, created_at, payment_method, profiles(name, avatar_url)')
                .in('goal_id', goalIds)),
            querySection(sb.from('gift_suggestions')
                .select('id, goal_id, name, price, link, is_selected, created_at, user_id, gift_votes(user_id)')
                .in('goal_id', goalIds))
        ]);
        if (loadVersion !== goalsLoadVersion || window.currentUser?.id !== userId) return;
        const membersByGoal = new Map();
        const contributionsByGoal = new Map();
        const giftsByGoal = new Map();
        (membersResult.data || []).forEach(row => {
            if (!membersByGoal.has(row.goal_id)) membersByGoal.set(row.goal_id, []);
            membersByGoal.get(row.goal_id).push(row);
        });
        (contributionsResult.data || []).forEach(row => {
            if (!contributionsByGoal.has(row.goal_id)) contributionsByGoal.set(row.goal_id, []);
            contributionsByGoal.get(row.goal_id).push(row);
        });
        (giftsResult.data || []).forEach(row => {
            if (!giftsByGoal.has(row.goal_id)) giftsByGoal.set(row.goal_id, []);
            giftsByGoal.get(row.goal_id).push(row);
        });
        const sectionErrors = {
            members: membersResult.error,
            contributions: contributionsResult.error,
            gifts: giftsResult.error
        };

        Object.keys(sampleGoals).forEach(k => delete sampleGoals[k]);

        rows.forEach(g => {
            g.goal_members = membersByGoal.get(g.id) || [];
            g.contributions = contributionsByGoal.get(g.id) || [];
            g.gift_suggestions = giftsByGoal.get(g.id) || [];
            g.sectionErrors = sectionErrors;
            const confirmed = g.contributions.filter(c => c.status === 'Confirmed');
            const collected = confirmed.reduce((s, c) => s + Number(c.amount), 0);
            const userContrib = confirmed
                .filter(c => c.user_id === window.currentUser.id)
                .reduce((s, c) => s + Number(c.amount), 0);
            const target = Number(g.target_amount) || 0;
            const percent = target > 0 ? Math.min(100, Math.round(collected / target * 100)) : 0;
            const daysLeft = g.deadline ? Math.max(0, Math.ceil((new Date(g.deadline) - new Date()) / 86400000)) : 0;
            const visibility = g.is_private ? 'Private' : 'Public';

            sampleGoals[g.id] = {
                title: g.name,
                occasion: `${g.occasion} · ${g.status} · ${visibility}`,
                image: categoryImages[(g.occasion || '').trim().toLowerCase()] || 'assets/images/occasion-01-birthday.png',
                description: g.description || '',
                collected, target, percent, daysLeft,
                members: sectionErrors.members ? 0 : g.goal_members.length,
                userContrib,
                id: g.id,
                goalId: g.id,
                rawGoal: g
            };
        });

        const tabsEl = $('.goal-tabs');
        if (tabsEl) {
            const addBtn = tabsEl.querySelector('[data-create]');
            tabsEl.innerHTML = '';
            Object.entries(sampleGoals).forEach(([key, g], i) => {
                const btn = document.createElement('button');
                btn.dataset.goal = key;
                btn.dataset.contributeId = g.goalId;
                btn.textContent = g.title;
                tabsEl.appendChild(btn);
            });
            if (addBtn) tabsEl.appendChild(addBtn);

            const firstGoal = Object.values(sampleGoals)[0];
            if (firstGoal) {
                $$('[data-contribute]').forEach(b => {
                    b.dataset.contributeId = firstGoal.goalId;
                });
            }

            bindGoalTabs();
        }

        setGoalsPageState('content');

        const goalKeys = Object.keys(sampleGoals);
        const selectedGoalKey = requestedGoalId && sampleGoals[requestedGoalId]
            ? requestedGoalId
            : goalKeys[0];
        if (selectedGoalKey) {
            activeGoalId = String(selectedGoalKey);
            $$('.goal-tabs button[data-goal]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.goal === activeGoalId);
            });
            showGoalData(sampleGoals[selectedGoalKey]);
        }

        const pendingLink = sessionStorage.getItem('sharedGoalCreatedLink');
        if (pendingLink) {
            $$('.copy-link-box span').forEach(el => el.textContent = pendingLink);
            sessionStorage.removeItem('sharedGoalCreatedLink');
        }
    } catch (error) {
        if (loadVersion !== goalsLoadVersion || window.currentUser?.id !== userId) return;
        console.error('Supabase Error loading goals:', error);
        Object.keys(sampleGoals).forEach(k => delete sampleGoals[k]);
        setGoalsPageState('error', 'Unable to load your goals.');
    }

    loadMyHelpRequests();
}

async function loadMyHelpRequests() {
    const section = $('#myHelpRequestsSection');
    const list = $('#myHelpRequestsList');
    if (!section || !list) return;

    if (!window.currentUser) {
        section.style.display = 'none';
        const pendingButton = $('#viewMyPendingHelpBtn');
        if (pendingButton) pendingButton.style.display = 'none';
        return;
    }

    const userId = window.currentUser.id;
    section.style.display = 'none';
    list.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">Loading your requests...</p>';
    const pendingButton = $('#viewMyPendingHelpBtn');
    if (pendingButton) pendingButton.style.display = 'none';

    try {
        const [{ data, error }, { data: pendingRequests, error: pendingError }] = await Promise.all([
            sb
            .from('help_requests')
            .select('id, title, category, target_amount, collected_amount, status, deadline, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
            sb
                .from('help_requests')
                .select('id')
                .eq('user_id', userId)
                .eq('status', 'Pending')
        ]);

        if (error) throw error;
        if (pendingError) throw pendingError;
        if (window.currentUser?.id !== userId) return;

        const pendingButton = $('#viewMyPendingHelpBtn');
        if (pendingButton) {
            pendingButton.style.display = pendingRequests?.length ? 'inline-flex' : 'none';
            pendingButton.textContent = pendingRequests?.length > 1
                ? 'View My Pending Requests'
                : 'View My Pending Request';
        }
        list.classList.toggle('has-overflow', (data?.length || 0) > 3);

        if (!data || !data.length) {
            list.replaceChildren();
            section.style.display = 'none';
            return;
        }

        let proofRows = [];
        if (proofReferenceSchemaAvailable !== false) {
            const proofResult = await sb
                .from('help_requests')
                .select('id, proof_path')
                .eq('user_id', userId)
                .not('proof_path', 'is', null);
            if (proofResult.error) {
                proofReferenceSchemaAvailable = false;
                console.warn('Proof references are unavailable until the proof_path migration is applied:', proofResult.error);
            } else {
                proofReferenceSchemaAvailable = true;
                proofRows = proofResult.data || [];
            }
        }
        const proofPaths = new Map(proofRows.map(row => [row.id, row.proof_path]));

        section.style.display = 'block';
        list.replaceChildren();
        data.forEach(r => {
            const row = document.createElement('div');
            row.className = 'my-help-request-item';

            const normalizedStatus = String(r.status || '').toLowerCase();
            const statusText = normalizedStatus === 'verified'
                ? 'Verified'
                : normalizedStatus === 'rejected'
                    ? 'Rejected'
                    : normalizedStatus === 'pending' || normalizedStatus === 'proof required'
                        ? 'Pending Verification'
                        : r.status || 'Pending Verification';
            const statusClass = normalizedStatus === 'verified'
                ? 'confirmed'
                : normalizedStatus === 'rejected'
                    ? 'warning'
                    : 'pending';
            const category = HELP_CATEGORY_LABELS[String(r.category || '').toLowerCase()] || r.category || 'Help Request';
            const target = Number(r.target_amount || 0);

            const details = document.createElement('div');
            details.className = 'my-help-request-details';
            const title = document.createElement('strong');
            title.className = 'my-help-request-title';
            title.textContent = r.title || 'Help Request';
            const summary = document.createElement('span');
            summary.className = 'my-help-request-summary';
            summary.textContent = `${category} · ₹${target.toLocaleString('en-IN')} target`;
            details.append(title, summary);

            const statusAndDate = document.createElement('div');
            statusAndDate.className = 'my-help-request-status';
            const status = document.createElement('span');
            status.className = `status-badge ${statusClass}`.trim();
            status.textContent = statusText;
            statusAndDate.appendChild(status);

            if (r.created_at) {
                const submitted = document.createElement('small');
                submitted.className = 'my-help-request-date';
                submitted.textContent = `Submitted ${new Date(r.created_at).toLocaleDateString('en-GB')}`;
                statusAndDate.appendChild(submitted);
            }

            row.append(details, statusAndDate);

            const proofPath = proofPaths.get(r.id);
            if (proofPath) {
                sb.storage.from(HELP_PROOF_BUCKET).createSignedUrl(proofPath, 3600)
                    .then(({ data: signed, error: signedError }) => {
                        if (signedError) {
                            console.error('Unable to create an owner-only proof link:', signedError);
                            return;
                        }
                        if (!signed?.signedUrl || !row.isConnected) return;
                        const proofLink = document.createElement('a');
                        proofLink.href = signed.signedUrl;
                        proofLink.target = '_blank';
                        proofLink.rel = 'noopener noreferrer';
                        proofLink.textContent = 'View attached proof (link expires in 1 hour)';
                        proofLink.className = 'my-help-request-proof';
                        details.appendChild(proofLink);
                    })
                    .catch(error => console.error('Unable to create an owner-only proof link:', error));
            }
            list.appendChild(row);
        });
    } catch (error) {
        console.error('Help request load failed:', error);
        if (window.currentUser?.id !== userId) return;
        section.style.display = 'block';
        list.replaceChildren();
        const message = document.createElement('p');
        message.style.cssText = 'color: var(--text-secondary); font-size: 14px;';
        message.textContent = 'Unable to load your requests.';
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'text-link';
        retry.textContent = 'Retry';
        retry.addEventListener('click', loadMyHelpRequests);
        list.append(message, retry);
        const pendingButton = $('#viewMyPendingHelpBtn');
        if (pendingButton) pendingButton.style.display = 'none';
    }
}

// Gift suggestions and voting
let userVotesCount = 1;
const MAX_VOTES = 3;
let userSuggestionsCount = 0;
const MAX_SUGGESTIONS = 2;

function bindGiftVoteBtn(btn) {
    btn.onclick = async () => {
        if (!window.currentUser || !window.currentDashboardGoal) return;
        const suggestionId = btn.dataset.id;
        if (!suggestionId) return;

        const isVoted = btn.classList.contains('voted');
        const countSpan = btn.querySelector('.vote-count');
        let count = Number(countSpan?.textContent || 0);

        btn.disabled = true;

        if (isVoted) {
            const { error } = await sb.from('gift_votes')
                .delete()
                .eq('suggestion_id', suggestionId)
                .eq('user_id', window.currentUser.id);

            if (!error) {
                btn.classList.remove('voted');
                userVotesCount--;
                if (countSpan) countSpan.textContent = Math.max(0, count - 1);
                showToast('Vote removed.');
                const s = window.currentDashboardGoal.rawGoal.gift_suggestions?.find(s => s.id == suggestionId);
                if (s && s.gift_votes) s.gift_votes = s.gift_votes.filter(v => v.user_id !== window.currentUser.id);
            } else {
                showToast('Failed to remove vote.');
            }
        } else {
            if (userVotesCount >= MAX_VOTES) {
                showToast(`Maximum ${MAX_VOTES} votes reached across gift ideas.`);
                btn.disabled = false;
                return;
            }

            const { error } = await sb.from('gift_votes')
                .insert({ suggestion_id: suggestionId, user_id: window.currentUser.id });

            if (!error) {
                btn.classList.add('voted');
                userVotesCount++;
                if (countSpan) countSpan.textContent = count + 1;
                showToast('Vote recorded! Creator will decide final pick.');
                const s = window.currentDashboardGoal.rawGoal.gift_suggestions?.find(s => s.id == suggestionId);
                if (s && s.gift_votes) s.gift_votes.push({ user_id: window.currentUser.id });
            } else {
                showToast('Failed to record vote.');
            }
        }
        btn.disabled = false;
    };
}
$$('.gift-vote-btn').forEach(bindGiftVoteBtn);

function bindFinalizeGiftBtn(btn) {
    btn.onclick = async () => {
        if (!window.currentUser || !window.currentDashboardGoal) return;
        const suggestionId = btn.dataset.id;
        if (!suggestionId) return;

        btn.disabled = true;
        btn.textContent = 'Finalizing...';

        try {
            const { error } = await sb.rpc('finalize_gift_decision', { target_suggestion_id: parseInt(suggestionId, 10) });

            if (error) throw error;

            showToast('Gift successfully selected!');
            if (typeof loadMyGoals === 'function') loadMyGoals();
        } catch (err) {
            showToast(err.message || 'Failed to finalize gift.');
            btn.disabled = false;
            btn.textContent = 'Finalize';
        }
    };
}
$$('.finalize-gift-btn').forEach(bindFinalizeGiftBtn);

$('#openSuggestGiftBtn')?.addEventListener('click', () => {
    if (userSuggestionsCount >= MAX_SUGGESTIONS) {
        showToast('You have reached the maximum limit of 2 suggestions.');
        return;
    }
    const form = $('#suggestGiftForm');
    if (form) form.reset();
    openModal('#suggestGiftOverlay', $('#openSuggestGiftBtn'));
});

$('.close-suggest-btn')?.addEventListener('click', () => closeModal());

$('#suggestGiftForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!window.currentUser || !window.currentDashboardGoal) return;

    if (userSuggestionsCount >= MAX_SUGGESTIONS) {
        showToast('You have reached the maximum limit of 2 suggestions.');
        closeModal();
        return;
    }

    const name = $('#giftNameInput')?.value.trim();
    const price = Number($('#giftPriceInput')?.value);
    const link = $('#giftLinkInput')?.value.trim();

    if (!name) {
        showToast('Please enter the gift name.');
        $('#giftNameInput')?.focus();
        return;
    }

    if (!price || price < 50) {
        showToast('Please enter an estimated price of at least ₹50.');
        $('#giftPriceInput')?.focus();
        return;
    }

    const submitBtn = $('#suggestGiftForm button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const { data: inserted, error } = await sb.from('gift_suggestions').insert({
        goal_id: window.currentDashboardGoal.goalId,
        user_id: window.currentUser.id,
        name: name,
        price: price,
        link: link || null
    }).select().single();

    if (submitBtn) submitBtn.disabled = false;

    if (error) {
        showToast('Failed to suggest gift.');
        return;
    }

    showToast(`Gift "${name}" suggested!`);
    closeModal();
    if (typeof loadMyGoals === 'function') loadMyGoals();
});

// Group decision voting
$('#approveDecisionBtn')?.addEventListener('click', () => {
    showToast('Group decisions are not yet connected to the database.');
});

$('#declineDecisionBtn')?.addEventListener('click', () => {
    showToast('Group decisions are not yet connected to the database.');
});

// Goal completion
$('#completeGoalBtn')?.addEventListener('click', () => {
    openModal('#completeGoalOverlay', $('#completeGoalBtn'));
});

$('#confirmCompleteBtn')?.addEventListener('click', () => {
    // Use real collected amount from the currently displayed goal
    const firstGoal = Object.values(sampleGoals)[0];
    const collected = firstGoal ? firstGoal.collected : 0;
    showToast(`Goal marked as completed! ₹${collected.toLocaleString('en-IN')} ready for distribution.`);
    closeModal();
    const tag = $('#mainGoalOccasion');
    if (tag) tag.textContent = tag.textContent.replace('Active', 'Completed');
});

// Help Someone cause filtering and search
$$('.help-tools .tabs button').forEach(btn => {
    btn.onclick = () => {
        $$('.help-tools .tabs button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const cat = btn.dataset.category;
        $$('.request').forEach(card => {
            card.style.display = (cat === 'all' || card.dataset.category === cat) ? '' : 'none';
        });
    };
});

$('#helpSearch')?.addEventListener('input', e => {
    const query = e.target.value.toLowerCase().trim();
    $$('.request').forEach(card => {
        card.style.display = card.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
});

$$('[data-share]').forEach(btn => {
    btn.onclick = () => {
        const title = btn.dataset.share || 'SharedGoal';
        navigator.clipboard?.writeText(window.location.href);
        showToast(`Link for "${title}" copied to clipboard!`);
    };
});

// Help request submission
$('#submitHelpBtn')?.addEventListener('click', async () => {
    const titleField = $('#helpTitle');
    const storyField = $('#helpStory');
    const amountField = $('#helpAmount');
    const title = titleField?.value.trim() || '';
    const story = storyField?.value.trim() || '';
    const amount = Number(amountField?.value);
    const category = selectedHelpCategory;
    const creatorUpiId = ($('#helpCreatorUpiId')?.value || '').trim();

    const titleValid = setFieldValidation(titleField, Boolean(title), 'Enter a title for your request.');
    const storyValid = setFieldValidation(storyField, Boolean(story), 'Describe the situation and how the funds will be used.');
    const amountValid = setFieldValidation(amountField, Number.isFinite(amount) && amount >= 500, 'Enter a target amount of at least ₹500.');

    if (!titleValid) {
        titleField?.focus();
        return;
    }
    if (!storyValid) {
        storyField?.focus();
        return;
    }
    if (!amountValid) {
        amountField?.focus();
        return;
    }
    if (!category) {
        showToast('Select a help category before submitting.');
        return;
    }

    if (!window.currentUser) {
        sessionStorage.setItem('pendingHelpRequest', JSON.stringify({
            data: {
                title: $('#helpTitle')?.value || '',
                category,
                story: $('#helpStory')?.value || '',
                amount: $('#helpAmount')?.value || '',
                creatorUpiId,
                entryContext
            }
        }));
        showToast('Please sign in to submit a help request.');
        closeModal();
        openModal('#loginOverlay');
        return;
    }

    if (selectedHelpProofFile && !selectedHelpProofPath) {
        showToast('Wait for the proof upload to complete, then submit again.');
        return;
    }

    const btn = $('#submitHelpBtn');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    const requestPayload = {
        user_id: window.currentUser.id,
        title,
        story,
        category,
        target_amount: amount,
        status: 'Pending',
        creator_upi_id: creatorUpiId || null,
        creator_qr_path: selectedHelpCreatorQrPath
    };
    if (selectedHelpProofPath) requestPayload.proof_path = selectedHelpProofPath;

    const { error } = await sb.from('help_requests').insert(requestPayload);

    btn.disabled = false;
    btn.textContent = 'Submit for Verification';

    if (error) {
        console.error('Help Request submission failed:', error);
        showToast('Failed to submit request. Please try again.');
        return;
    }

    sessionStorage.removeItem('pendingHelpRequest');
    showToast('Help Request submitted for verification. Status: Pending Verification.');
    closeModal();
    $('#helpTitle') && ($('#helpTitle').value = '');
    $('#helpStory') && ($('#helpStory').value = '');
    $('#helpAmount') && ($('#helpAmount').value = '');
    if ($('#helpCreatorUpiId')) $('#helpCreatorUpiId').value = '';
    selectedHelpProofFile = null;
    selectedHelpProofPath = null;
    selectedHelpCreatorQrPath = null;
    if ($('#helpProofFile')) $('#helpProofFile').value = '';
    if ($('#helpProofFileName')) $('#helpProofFileName').textContent = '';
    if ($('#helpCreatorQrInput')) $('#helpCreatorQrInput').value = '';
    if ($('#helpCreatorQrName')) $('#helpCreatorQrName').textContent = 'No QR uploaded yet.';
    if ($('#removeHelpCreatorQrBtn')) $('#removeHelpCreatorQrBtn').style.display = 'none';
    if (typeof loadMyHelpRequests === 'function') loadMyHelpRequests();
    if (typeof loadHelpRequests === 'function') loadHelpRequests();
});

let helpRequestsLoadVersion = 0;

// Load verified help requests from Supabase
async function loadHelpRequests() {
    const grid = $('.request-grid');
    if (!grid) return;
    const loadVersion = ++helpRequestsLoadVersion;
    const verifiedCount = $('#communityVerifiedCount');
    const raisedTotal = $('#communityRaisedTotal');
    const supportCount = $('#communitySupportCount');
    grid.innerHTML = '<article class="request" style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--text-secondary);">Loading verified requests...</article>';
    if (verifiedCount) verifiedCount.textContent = '…';
    if (supportCount) supportCount.textContent = '…';
    if (raisedTotal) raisedTotal.textContent = '…';

    let requests;
    try {
        const { data, error } = await sb
            .from('help_requests')
            .select('id, user_id, title, category, story, target_amount, collected_amount, status, deadline')
            .eq('status', 'Verified')
            .order('created_at', { ascending: false });
        if (error) throw error;
        requests = data || [];
        if (loadVersion !== helpRequestsLoadVersion) return;
    } catch (error) {
        console.error('Failed to load verified help requests:', error);
        if (loadVersion !== helpRequestsLoadVersion) return;
        if (verifiedCount) verifiedCount.textContent = '—';
        if (supportCount) supportCount.textContent = '—';
        if (raisedTotal) raisedTotal.textContent = '—';
        grid.innerHTML = '<article class="request" style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--text-secondary);">Unable to load verified requests.</article>';
        const retryCard = grid.firstElementChild;
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'btn small';
        retry.textContent = 'Retry';
        retry.addEventListener('click', loadHelpRequests);
        retryCard?.appendChild(retry);
        grid.style.visibility = 'visible';
        return;
    }

    const raised = requests.reduce((sum, r) => sum + Number(r.collected_amount || 0), 0);
    const verifiedCountText = requests.length.toLocaleString('en-IN');
    if (verifiedCount) verifiedCount.textContent = verifiedCountText;
    if (supportCount) supportCount.textContent = verifiedCountText;
    if (raisedTotal) {
        raisedTotal.textContent = raised >= 100000
            ? '₹' + (raised / 100000).toFixed(1) + 'L'
            : '₹' + raised.toLocaleString('en-IN');
    }

    if (!requests.length) {
        grid.innerHTML = '<article class="request" style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--text-secondary);">No verified requests yet.</article>';
        grid.style.visibility = 'visible';
        restorePendingHelpContribution(requests);
        return;
    }

    // Get pending contributions for requests owned by current user
    const userRequestIds = window.currentUser ? requests.filter(r => r.user_id === window.currentUser.id).map(r => r.id) : [];
    let pendingContributions = [];
    if (userRequestIds.length > 0) {
        try {
            const { data: pending, error: pendingError } = await sb
                .from('contributions')
                .select('id, help_request_id, amount, payment_method, status')
                .in('help_request_id', userRequestIds)
                .eq('status', 'Pending');
            if (pendingError) throw pendingError;
            if (pending) pendingContributions = pending;
        } catch (error) {
            console.error('Failed to load pending Help Request contributions:', error);
        }
    }
    if (loadVersion !== helpRequestsLoadVersion) return;

    grid.innerHTML = '';
    requests.forEach(r => {
        const article = document.createElement('article');
        article.className = 'request';
        article.dataset.category = r.category?.toLowerCase() || 'assistance';

        let pendingHtml = '';
        if (window.currentUser && r.user_id === window.currentUser.id) {
            const requestPending = pendingContributions.filter(c => c.help_request_id === r.id);
            if (requestPending.length > 0) {
                pendingHtml = `
                    <div class="pending-contributions" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                        <h4 style="margin-bottom: 0.5rem; font-size: 0.875rem;">Pending Contributions (Only visible to you)</h4>
                        ${requestPending.map(c => `
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; background: var(--bg-secondary, #f8f9fa); padding: 0.5rem; border-radius: 4px; font-size: 0.875rem;">
                                <div>
                                    <strong>₹${Number(c.amount).toLocaleString('en-IN')}</strong> via ${c.payment_method || 'Unknown'}
                                </div>
                                <button class="btn small" data-confirm-contribution="${c.id}" style="padding: 0.25rem 0.5rem;">Confirm</button>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }

        article.innerHTML = `
            <div class="request-img-wrap">
                <img src="${categoryImages[(r.category || '').trim().toLowerCase()] || 'assets/images/help-01-education.png'}" alt="${r.title}">
            </div>
            <div>
                <span class="eyebrow">✓ VERIFIED · ${(r.category || 'General').toUpperCase()}</span>
                <h3>${r.title}</h3>
                <p>${r.story}</p>
                <div class="bar"><i style="width: ${Math.min(100, Math.round((Number(r.collected_amount || 0) / Number(r.target_amount || 1)) * 100))}%"></i></div>
                <div class="request-meta">
                    <strong>₹${Number(r.collected_amount || 0).toLocaleString('en-IN')} of ₹${Number(r.target_amount).toLocaleString('en-IN')}</strong>
                    <span>${r.deadline ? Math.max(0, Math.ceil((new Date(r.deadline) - new Date()) / 86400000)) + ' days left' : 'Open'}</span>
                </div>
                <div class="request-actions">
                    <button class="btn small" data-contribute="${r.title}" data-help-id="${r.id}">Contribute</button>
                    <button class="btn small ghost" data-share="${r.title}">Share</button>
                </div>
                ${pendingHtml}
            </div>
        `;
        grid.appendChild(article);
    });
    grid.style.visibility = 'visible';

    // Re-bind contribute/share on new cards
    $$('[data-contribute]').forEach(btn => {
        btn.onclick = () => {
            openHelpContribution(
                btn.dataset.helpId,
                btn.dataset.contribute || 'Help Someone',
                btn
            );
        };
    });
    $$('[data-share]').forEach(btn => {
        btn.onclick = () => {
            navigator.clipboard?.writeText(window.location.href);
            showToast(`Link for "${btn.dataset.share}" copied to clipboard!`);
        };
    });

    // Bind confirm contribution buttons
    $$('[data-confirm-contribution]').forEach(btn => {
        btn.onclick = async () => {
            btn.disabled = true;
            btn.textContent = 'Confirming...';
            const contributionId = btn.dataset.confirmContribution;
            const { error } = await sb.rpc('confirm_help_contribution', {
                target_contribution_id: Number(contributionId)
            });

            if (error) {
                console.error('Confirm help contribution:', error);
                showToast('Failed to confirm contribution. Please try again.');
                btn.disabled = false;
                btn.textContent = 'Confirm';
                return;
            }

            showToast('Contribution confirmed successfully.');
            loadHelpRequests(); // Refresh
        };
    });
    restorePendingHelpContribution(requests);
}

// ── Auth ─────────────────────────────────────────────────────────────────────

window.currentUser = null;
let authResolved = false;
let helpRequestRealtimeChannel = null;
let helpRequestRefreshInterval = null;
let helpRequestRefreshTimeout = null;

function startHelpRequestUpdates() {
    if (!$('.request-grid')) return;

    if (!helpRequestRealtimeChannel) {
        try {
            helpRequestRealtimeChannel = sb
                .channel('public-help-request-updates')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'help_requests'
                }, () => {
                    clearTimeout(helpRequestRefreshTimeout);
                    helpRequestRefreshTimeout = setTimeout(() => {
                        loadHelpRequests();
                        loadMyHelpRequests();
                    }, 300);
                })
                .subscribe(status => {
                    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        console.warn('Help Request Realtime is unavailable; periodic refresh remains active.');
                    }
                });
        } catch (error) {
            console.warn('Help Request Realtime could not be started; periodic refresh remains active.', error);
        }
    }

    if (!helpRequestRefreshInterval) {
        helpRequestRefreshInterval = setInterval(() => {
            loadHelpRequests();
            loadMyHelpRequests();
        }, 30000);
    }
}

function updateAuthUI() {
    const user = window.currentUser;
    const profileBtns = $$('.user-profile-btn[data-profile]');

    // Helper: set text in all matching IDs across pages
    const setModal = (id, val) => { const el = $(id); if (el) el.textContent = val; };

    if (!user) {
        $$('.user-avatar-circle').forEach(el => el.textContent = '');
        $$('.user-profile-btn .name').forEach(el => el.textContent = 'Sign In');
        $$('.menu-user-card strong').forEach(el => el.textContent = '');
        $$('.menu-user-card small').forEach(el => el.textContent = '');
        profileBtns.forEach(btn => { btn.onclick = () => openModal('#loginOverlay', btn); });
        // Clear profile modal fields across all pages
        ['profileTitle', 'profileTitleMyGoals', 'profileTitleHelp'].forEach(id => setModal('#' + id, ''));
        ['profileEmail', 'profileEmailMyGoals', 'profileEmailHelp'].forEach(id => setModal('#' + id, ''));
        ['profileCreated', 'profileCreatedMyGoals', 'profileCreatedHelp'].forEach(id => setModal('#' + id, '—'));
        ['profileJoined', 'profileJoinedMyGoals', 'profileJoinedHelp'].forEach(id => setModal('#' + id, '—'));
        ['profileContributed', 'profileContributedMyGoals', 'profileContributedHelp'].forEach(id => setModal('#' + id, '—'));
        
        $$('.dropdown-signout-btn').forEach(btn => {
            btn.textContent = 'Sign In';
            btn.onclick = () => openModal('#loginOverlay', btn);
        });
        return;
    }

    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
    const initial = name[0]?.toUpperCase() || '?';
    $$('.user-avatar-circle').forEach(el => el.textContent = initial);
    $$('.user-profile-btn .name').forEach(el => el.textContent = name);
    $$('.menu-user-card strong').forEach(el => el.textContent = name);
    $$('.menu-user-card small').forEach(el => el.textContent = user.email);
    profileBtns.forEach(btn => { btn.onclick = () => openModal('#profileOverlay', btn); });

    // Populate profile modal identity
    ['profileTitle', 'profileTitleMyGoals', 'profileTitleHelp'].forEach(id => setModal('#' + id, name));
    ['profileEmail', 'profileEmailMyGoals', 'profileEmailHelp'].forEach(id => setModal('#' + id, user.email));

    // Fetch live stats for the profile modal
    (async () => {
        const uid = user.id;

        const [createdRes, joinedRes, contribRes] = await Promise.all([
            sb.from('goals').select('id', { count: 'exact', head: true }).eq('creator_id', uid),
            sb.from('goal_members').select('id', { count: 'exact', head: true }).eq('user_id', uid),
            sb.from('contributions').select('amount').eq('user_id', uid).eq('status', 'Confirmed')
        ]);

        const created = createdRes.count ?? 0;
        const joined = joinedRes.count ?? 0;
        const contributed = (contribRes.data || []).reduce((s, r) => s + Number(r.amount), 0);
        const contribLabel = contributed >= 1000
            ? '₹' + (contributed / 1000).toFixed(contributed % 1000 === 0 ? 0 : 1) + 'k'
            : '₹' + contributed;

        ['profileCreated', 'profileCreatedMyGoals', 'profileCreatedHelp'].forEach(id => setModal('#' + id, created));
        ['profileJoined', 'profileJoinedMyGoals', 'profileJoinedHelp'].forEach(id => setModal('#' + id, joined));
        ['profileContributed', 'profileContributedMyGoals', 'profileContributedHelp'].forEach(id => setModal('#' + id, contribLabel));
    })();

    $$('.dropdown-signout-btn').forEach(btn => {
        btn.textContent = 'Sign Out';
        btn.onclick = () => sb.auth.signOut().then(() => window.location.reload());
    });
}

// Wire Google sign-in button(s)
$$('.google-btn:not(#step5Next)').forEach(btn => {
    btn.onclick = () => sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href }
    });
});

// Auth state: fires on load and on sign-in / sign-out
sb.auth.onAuthStateChange((_event, session) => {
    window.currentUser = session?.user ?? null;
    updateAuthUI();
    if (!authResolved) return;
    if (_event === 'SIGNED_OUT') {
        renderLoggedOutGoals();
        loadMyHelpRequests();
    } else if (_event === 'SIGNED_IN') {
        if ($('#mainGoalTitle')) loadMyGoals();
        loadMyHelpRequests();
        loadNotifications();
        if ($('.request-grid')) loadHelpRequests();
    }
});

// Deep link join flow for Private Invitations
async function handleDeepLinkJoin() {
    const params = new URLSearchParams(window.location.search);
    let inviteToken = params.get('invite');

    // Check for pending invite from OAuth resume
    if (!inviteToken) {
        inviteToken = sessionStorage.getItem('pendingInvite');
        if (!inviteToken) return;
    }

    if (!window.currentUser) {
        // Unauthenticated -> store token and trigger Google OAuth
        sessionStorage.setItem('pendingInvite', inviteToken);
        openModal('#loginOverlay');
        return;
    }

    // Call the secure database RPC to process acceptance

    const { error } = await sb.rpc('join_goal_with_reusable_invite', { invite_token: inviteToken });

    if (error) {
        console.error("Invitation acceptance failed:", error);

        if (error.message.includes('Invalid invitation token')) {
            showToast('This invitation link is invalid.');
            window.history.replaceState({}, '', window.location.pathname);
        } else {
            showToast('Unable to use this invitation. Please check the link and try again.');
            window.history.replaceState({}, '', window.location.pathname);
        }
        return;
    }

    // Success! Clear URL params and render the dashboard
    showToast('You have successfully joined the goal!');
    window.history.replaceState({}, '', window.location.pathname);
    sessionStorage.removeItem('pendingInvite');
    if ($('#mainGoalTitle')) loadMyGoals();
}

async function loadNotifications() {
    if (!window.currentUser) return;

    const { data, error } = await sb.from('notifications')
        .select('*')
        .eq('user_id', window.currentUser.id)
        .order('created_at', { ascending: false });

    if (error || !data) return;

    const unreadCount = data.filter(n => !n.is_read).length;
    const badges = $$('.notif-badge');
    badges.forEach(b => {
        if (unreadCount > 0) {
            b.style.display = 'block';
            b.textContent = unreadCount;
        } else {
            b.style.display = 'none';
        }
    });

    const notesContainer = $('#notificationsOverlay .notes');
    if (notesContainer) {
        notesContainer.innerHTML = '';
        if (data.length === 0) {
            notesContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted);">No notifications yet.</div>';
            return;
        }

        data.forEach(n => {
            const item = document.createElement('div');
            item.className = `note-item ${n.is_read ? '' : 'unread'}`;

            const timeStr = new Date(n.created_at).toLocaleDateString('en-IN', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            item.innerHTML = `
                <strong>${n.message}</strong>
                <small>${timeStr}</small>
            `;

            item.onclick = async () => {
                if (!n.is_read) {
                    item.classList.remove('unread');
                    n.is_read = true;

                    const remainingUnread = parseInt(badges[0]?.textContent || 0) - 1;
                    badges.forEach(b => {
                        if (remainingUnread > 0) {
                            b.textContent = remainingUnread;
                        } else {
                            b.style.display = 'none';
                        }
                    });

                    await sb.from('notifications').update({ is_read: true }).eq('id', n.id);
                }
            };

            notesContainer.appendChild(item);
        });
    }
}

function restorePendingCreateGoal() {
    const saved = sessionStorage.getItem('pendingCreateGoal');
    if (!saved) return;
    try {
        const state = JSON.parse(saved);
        if (state && state.data) {
            Object.assign(goalData, state.data);
            goalData.visibility = 'Private';
            entryContext = goalData.entryContext || getPageEntryContext();
            creationType = 'PERSONAL_GOAL';
            goalData.creationType = creationType;
            selectedCreationCategory = goalData.isCustomOccasion || goalData.customOccasion ? 'Custom' : goalData.occasion;
            renderCreationCategories();

            // Re-populate DOM inputs
            const customOccasionInput = $('#customOccasionInput');
            if (customOccasionInput) customOccasionInput.value = goalData.customOccasion || '';
            if ($('#goalName')) $('#goalName').value = goalData.name || '';
            if ($('#goalDesc')) $('#goalDesc').value = goalData.description || '';
            if ($('#goalAmount')) $('#goalAmount').value = goalData.target || '';
            if ($('#goalDeadline')) $('#goalDeadline').value = goalData.deadline || '';

            $$('#styleChoices button').forEach(b => b.classList.toggle('selected', b.dataset.value === goalData.style));

            updateReviewScreen();

            const nextStep = 6;
            currentStep = nextStep;

            openModal('#createGoalOverlay');
            goToStep(nextStep);
        }
    } catch (e) {
        console.error('Failed to restore wizard state', e);
    }
}

function restorePendingHelpRequestSelection() {
    const saved = sessionStorage.getItem('pendingHelpRequestSelection');
    if (!saved || !$('#helpOverlay')) return;
    try {
        const state = JSON.parse(saved);
        selectedHelpCategory = state.category || 'assistance';
        entryContext = state.entryContext || 'HOME';
        goalData.entryContext = entryContext;
        creationType = 'HELP_SOMEONE';
        goalData.creationType = creationType;
        selectedCreationCategory = state.selectedCreationCategory || 'education';
        renderCreationCategories();
        if (selectedCreationCategory === 'custom' && $('#customHelpCategoryInput')) {
            $('#customHelpCategoryInput').value = state.customCategory || selectedHelpCategory;
        }
        sessionStorage.removeItem('pendingHelpRequestSelection');
        updateHelpCategoryLabel();
        if ($('#helpRequestStepLabel')) $('#helpRequestStepLabel').textContent = 'Step 3 of 3';
        openModal('#helpOverlay');
    } catch (e) {
        console.error('Failed to restore selected Help Someone category', e);
    }
}

function restorePendingHelpRequest() {
    const saved = sessionStorage.getItem('pendingHelpRequest');
    if (!saved) return;
    try {
        const state = JSON.parse(saved);
        if (state && state.data) {
            if ($('#helpTitle')) $('#helpTitle').value = state.data.title ?? '';
            selectedHelpCategory = state.data.category ?? 'assistance';
            entryContext = state.data.entryContext || getPageEntryContext();
            goalData.entryContext = entryContext;
            creationType = 'HELP_SOMEONE';
            goalData.creationType = creationType;
            updateHelpCategoryLabel();
            if ($('#helpRequestStepLabel')) $('#helpRequestStepLabel').textContent = 'Step 3 of 3';
            if ($('#helpStory')) $('#helpStory').value = state.data.story ?? '';
            if ($('#helpAmount')) $('#helpAmount').value = state.data.amount ?? '';
            if ($('#helpCreatorUpiId')) $('#helpCreatorUpiId').value = state.data.creatorUpiId ?? '';

            openModal('#helpOverlay');
        }
    } catch (e) {
        console.error('Failed to restore Help Request state', e);
    }
}

// Bootstrap only after Supabase resolves the initial session.
async function initializeApp() {
    try {
        const { data: { session }, error } = await sb.auth.getSession();
        if (error) throw error;
        window.currentUser = session?.user ?? null;
        authResolved = true;
        resolveAuthReady();
        updateAuthUI();

        handleDeepLinkJoin();

        if (session) {
            restorePendingCreateGoal();
            restorePendingHelpRequest();
            loadNotifications();
        }
        restorePendingHelpRequestSelection();
        if ($('#mainGoalTitle')) loadMyGoals();
        if ($('.request-grid')) {
            loadHelpRequests();
            loadMyHelpRequests();
            startHelpRequestUpdates();
        }
    } catch (error) {
        console.error('Unable to resolve the initial Supabase session:', error);
        resolveAuthReady();
        if ($('#mainGoalTitle')) setGoalsPageState('error', 'Unable to verify your sign-in status. Please retry.');
        if ($('.request-grid')) loadHelpRequests();
    }
}
initializeApp();
