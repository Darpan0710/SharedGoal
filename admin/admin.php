<?php

session_start();

$host = "localhost";
$user = "root";
$pass = "";
$db = "sharedgoal";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Database connection failed.");
}

$allowedEmails = [
    "darpanjhaveri0710@gmail.com",
    "2216.stkabirnrnp@gmail.com"
];

if (isset($_GET["logout"])) {
    session_destroy();
    header("Location: admin.php");
    exit;
}

if (isset($_POST["login"])) {

    $email = trim($_POST["email"]);
    $password = $_POST["password"];

    if (!in_array($email, $allowedEmails)) {
        $error = "Access denied.";
    } else {

        $stmt = $conn->prepare(
            "SELECT password FROM admin_users WHERE email = ?"
        );

        $stmt->bind_param("s", $email);
        $stmt->execute();

        $result = $stmt->get_result();
        $admin = $result->fetch_assoc();

        if ($admin && password_verify($password, $admin["password"])) {
            $_SESSION["admin"] = $email;
            header("Location: admin.php");
            exit;
        }

        $error = "Invalid email or password.";
    }
}

if (isset($_POST["action"]) && isset($_SESSION["admin"])) {

    $id = (int) $_POST["id"];
    $action = $_POST["action"];

    if ($action === "approve") {
        $status = "Verified";
    } elseif ($action === "reject") {
        $status = "Rejected";
    } else {
        $status = "Proof Required";
    }

    $stmt = $conn->prepare(
        "UPDATE help_requests SET status = ? WHERE id = ?"
    );

    $stmt->bind_param("si", $status, $id);
    $stmt->execute();
}

if (!isset($_SESSION["admin"])) {
?>

<!doctype html>
<html>
<head>
    <title>SharedGoal Admin</title>
    <link rel="stylesheet" href="style.css">
</head>

<body class="login-page">

<div class="login-box">

    <h1>SharedGoal</h1>
    <p>Admin Verification</p>

    <?php if (isset($error)) { ?>
        <div class="error">
            <?= htmlspecialchars($error) ?>
        </div>
    <?php } ?>

    <form method="post">

        <label>Email</label>
        <input
            type="email"
            name="email"
            required
            placeholder="Admin email"
        >

        <label>Password</label>
        <input
            type="password"
            name="password"
            required
            placeholder="Password"
        >

        <button name="login" type="submit">
            Login
        </button>

    </form>

</div>

</body>
</html>

<?php
exit;
}
?>

<!doctype html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>SharedGoal Admin</title>
    <link rel="stylesheet" href="style.css">
</head>

<body>

<header class="topbar">

    <div>
        <strong>SharedGoal Admin</strong>
        <span>Verification Panel</span>
    </div>

    <div>
        <?= htmlspecialchars($_SESSION["admin"]) ?>
        <a href="?logout=1">Logout</a>
    </div>

</header>

<main>

    <div class="heading">
        <div>
            <small>HELP SOMEONE</small>
            <h1>Verification Requests</h1>
        </div>
    </div>

    <section class="requests">

        <?php

        $result = $conn->query(
            "SELECT * FROM help_requests ORDER BY created_at DESC"
        );

        while ($request = $result->fetch_assoc()) {
        ?>

        <article class="request">

            <div>

                <small>
                    <?= htmlspecialchars($request["category"]) ?>
                </small>

                <h2>
                    <?= htmlspecialchars($request["title"]) ?>
                </h2>

                <p>
                    <?= htmlspecialchars($request["story"]) ?>
                </p>

                <strong>
                    ₹<?= number_format($request["amount"]) ?>
                </strong>

            </div>

            <div class="request-right">

                <span class="status <?= strtolower(str_replace(" ", "-", $request["status"])) ?>">
                    <?= htmlspecialchars($request["status"]) ?>
                </span>

                <button
                    onclick="openReview(<?= $request['id'] ?>)"
                >
                    Review
                </button>

            </div>

        </article>

        <?php } ?>

    </section>

</main>

<div class="modal" id="reviewModal">

    <div class="modal-box">

        <button class="close" onclick="closeReview()">×</button>

        <small>REVIEW REQUEST</small>

        <h2 id="reviewTitle"></h2>

        <p id="reviewStory"></p>

        <div class="review-info">
            <strong>Category</strong>
            <span id="reviewCategory"></span>

            <strong>Target</strong>
            <span id="reviewAmount"></span>
        </div>

        <form method="post">

            <input type="hidden" name="id" id="requestId">

            <div class="actions">

                <button
                    name="action"
                    value="approve"
                    class="approve"
                >
                    Approve
                </button>

                <button
                    name="action"
                    value="proof"
                    class="proof"
                >
                    Request Proof
                </button>

                <button
                    name="action"
                    value="reject"
                    class="reject"
                >
                    Reject
                </button>

            </div>

        </form>

    </div>

</div>

<script>

const requests = <?= json_encode(
    $conn->query("SELECT * FROM help_requests")->fetch_all(MYSQLI_ASSOC)
) ?>;

function openReview(id) {

    const request = requests.find(
        item => Number(item.id) === Number(id)
    );

    if (!request) return;

    document.getElementById("requestId").value = request.id;
    document.getElementById("reviewTitle").textContent = request.title;
    document.getElementById("reviewStory").textContent = request.story;
    document.getElementById("reviewCategory").textContent = request.category;
    document.getElementById("reviewAmount").textContent =
        "₹" + Number(request.amount).toLocaleString("en-IN");

    document.getElementById("reviewModal").classList.add("show");
}

function closeReview() {
    document.getElementById("reviewModal").classList.remove("show");
}

</script>

</body>
</html>