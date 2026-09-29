const SUPABASE_URL = "https://aanxnlabaqmsvxdcnmqg.supabase.co";

const SUPABASE_KEY = "sb_publishable_z2W6GCRu51hFfT08w17NOA_JeoVP8HS";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

console.log("Supabase connected:", supabaseClient);

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const show = id => $(id)?.classList.add("show");

const close = () =>
    $$(".overlay").forEach(x => x.classList.remove("show"));

const open = id => {
    close();
    show(id);
};

$$("[data-login]").forEach(
    b => b.onclick = () => open("#loginOverlay")
);

$$("[data-create]").forEach(
    b => b.onclick = () => {
        step(1);
        open("#createGoalOverlay");
    }
);

$("#notificationBtn")?.addEventListener(
    "click",
    () => open("#notificationsOverlay")
);

$("#createHelpBtn")?.addEventListener(
    "click",
    () => open("#helpOverlay")
);

$("#bottomHelpBtn")?.addEventListener(
    "click",
    () => open("#helpOverlay")
);

$$(".close").forEach(
    b => b.onclick = close
);

$$(".overlay").forEach(
    o => o.addEventListener(
        "click",
        e => {
            if (e.target === o) close();
        }
    )
);

document.addEventListener(
    "keydown",
    e => e.key === "Escape" && close()
);

let current = 1;

function step(n) {
    current = n;

    $$(".goal-step").forEach(
        x => x.classList.toggle(
            "active",
            +x.dataset.step === n
        )
    );
}

$$(".next").forEach(
    b => b.onclick = () => {
        if (
            current === 2 &&
            !$("#goalName")?.value.trim()
        ) {
            return alert("Please enter a goal name.");
        }

        if (
            current === 3 &&
            !$("#goalAmount")?.value
        ) {
            return alert("Please enter a target amount.");
        }

        step(Math.min(5, current + 1));

        if ($("#reviewName")) {
            $("#reviewName").textContent =
                $("#goalName")?.value || "Your SharedGoal";
        }

        if ($("#reviewAmount")) {
            $("#reviewAmount").textContent =
                "Target: ₹" + ($("#goalAmount")?.value || "0");
        }
    }
);

$$("[data-choice]").forEach(
    b => b.onclick = () => {
        b.parentElement
            .querySelectorAll("button")
            .forEach(x => x.classList.remove("selected"));

        b.classList.add("selected");
    }
);

$("#finishGoal")?.addEventListener(
    "click",
    () => {
        alert("Goal flow ready for Supabase Google Login.");
        close();
    }
);

$("#googleLoginBtn")?.addEventListener(
    "click",
    () => alert("Google Login will be connected with Supabase.")
);

$$("[data-contribute]").forEach(
    b => b.onclick = () => {
        if ($("#contributionGoal")) {
            $("#contributionGoal").textContent =
                b.dataset.contribute;
        }

        open("#contributionOverlay");
    }
);

$$(".quick button").forEach(
    b => b.onclick = () =>
        $("#contributionAmount").value = b.dataset.amount
);

$("#makeContributionBtn")?.addEventListener(
    "click",
    () => {
        if (!Number($("#contributionAmount")?.value)) {
            return alert("Enter a valid amount.");
        }

        alert("Payment flow will be connected with Razorpay.");
        close();
    }
);

$$(".payments button").forEach(
    b => b.onclick = () => {
        b.parentElement
            .querySelectorAll("button")
            .forEach(x => x.classList.remove("active"));

        b.classList.add("active");
    }
);

$$(".tabs button").forEach(
    b => b.onclick = () => {
        $$(".tabs button").forEach(
            x => x.classList.remove("active")
        );

        b.classList.add("active");

        let c = b.dataset.category;

        $$(".request").forEach(
            x =>
                x.style.display =
                    c === "all" || x.dataset.category === c
                        ? ""
                        : "none"
        );
    }
);

$("#helpSearch")?.addEventListener(
    "input",
    e => {
        let q = e.target.value.toLowerCase();

        $$(".request").forEach(
            x =>
                x.style.display =
                    x.textContent.toLowerCase().includes(q)
                        ? ""
                        : "none"
        );
    }
);

$$('input[type="date"]').forEach(
    x => x.min = new Date().toISOString().split("T")[0]
);

$("#submitHelpBtn")?.addEventListener(
    "click",
    () => {
        alert("Request submitted for verification.");
        close();
    }
);

$("#menuBtn")?.addEventListener(
    "click",
    () => {
        $("#mobileMenu")?.classList.toggle("show");
    }
);