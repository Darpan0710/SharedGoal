<?php

session_start();

$envPath = __DIR__ . '/../.env';
$env = file_exists($envPath) ? parse_ini_file($envPath) : [];

$host = $env['DB_HOST'] ?? "localhost";
$user = $env['DB_USER'] ?? "root";
$pass = $env['DB_PASS'] ?? "";
$db   = $env['DB_NAME'] ?? "sharedgoal";

$supabaseUrl = $env['SUPABASE_URL'] ?? getenv('SUPABASE_URL');
$supabaseKey = $env['SUPABASE_KEY'] ?? getenv('SUPABASE_KEY');

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Database connection failed.");
}

$allowedEmails = [
    "darpanjhaveri0710@gmail.com",
    "2216.stkabirnrnp@gmail.com"
];

function supabaseRequest($url, $key, $method = "GET", $data = null) {

    $ch = curl_init($url);

    $headers = [
        "apikey: " . $key,
        "Authorization: Bearer " . $key,
        "Content-Type: application/json"
    ];

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

    if ($data !== null) {
        curl_setopt(
            $ch,
            CURLOPT_POSTFIELDS,
            json_encode($data)
        );
    }

    $response = curl_exec($ch);

    curl_close($ch);

    return json_decode($response, true);
}

function createHelpProofSignedUrl($supabaseUrl, $supabaseKey, $path) {
    $encodedPath = implode(
        "/",
        array_map("rawurlencode", explode("/", $path))
    );
    $result = supabaseRequest(
        rtrim($supabaseUrl, "/") .
        "/storage/v1/object/sign/help-request-proofs/" .
        $encodedPath,
        $supabaseKey,
        "POST",
        ["expiresIn" => 900]
    );

    if (!is_array($result) || empty($result["signedURL"])) {
        return null;
    }

    $signedUrl = $result["signedURL"];
    return str_starts_with($signedUrl, "http")
        ? $signedUrl
        : rtrim($supabaseUrl, "/") . "/" . ltrim($signedUrl, "/");
}

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

        if (
            $admin &&
            password_verify(
                $password,
                $admin["password"]
            )
        ) {

            $_SESSION["admin"] = $email;

            header("Location: admin.php");

            exit;
        }

        $error = "Invalid email or password.";
    }
}

if (
    isset($_POST["action"]) &&
    isset($_SESSION["admin"])
) {

    $id = (int) $_POST["id"];

    $action = $_POST["action"];

    if ($action === "approve") {

        $status = "Verified";

    } elseif ($action === "reject") {

        $status = "Rejected";

    } else {

        $status = "Proof Required";
    }

    supabaseRequest(
        $supabaseUrl .
        "/rest/v1/help_requests?id=eq." .
        $id,
        $supabaseKey,
        "PATCH",
        [
            "status" => $status
        ]
    );

    header("Location: admin.php");

    exit;
}

if (!isset($_SESSION["admin"])) {
?>

<!doctype html>

<html>

<head>

    <title>SharedGoal Admin</title>

    <link
        rel="stylesheet"
        href="style.css"
    >

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

        <button
            name="login"
            type="submit"
        >
            Login
        </button>

    </form>

</div>

</body>

</html>

<?php

exit;

}

$requests = supabaseRequest(
    $supabaseUrl .
    "/rest/v1/help_requests?status=eq.Pending&select=*&order=created_at.desc",
    $supabaseKey
);

if (!is_array($requests) || isset($requests['message']) || isset($requests['error'])) {
    $requests = [];
}

foreach ($requests as &$request) {
    $proofPath = $request["proof_path"] ?? "";
    $request["proof_signed_url"] = $proofPath !== ""
        ? createHelpProofSignedUrl($supabaseUrl, $supabaseKey, $proofPath)
        : null;
    unset($request["proof_path"]);
}
unset($request);

?>

<!doctype html>

<html>

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
    >

    <title>SharedGoal Admin</title>

    <link
        rel="stylesheet"
        href="style.css"
    >

</head>

<body>

<header class="topbar">

    <div>

        <strong>
            SharedGoal Admin
        </strong>

        <span>
            Verification Panel
        </span>

    </div>

    <div>

        <?= htmlspecialchars($_SESSION["admin"]) ?>

        <a href="?logout=1">
            Logout
        </a>

    </div>

</header>

<main>

    <div class="heading">

        <div>

            <small>
                HELP SOMEONE
            </small>

            <h1>
                Verification Requests
            </h1>

        </div>

    </div>

    <section class="requests">

        <?php if (empty($requests)) { ?>

            <p>
                No help requests found.
            </p>

        <?php } ?>

        <?php foreach ($requests as $request) { ?>

            <article class="request">

                <div>

                    <small>
                        <?= htmlspecialchars(
                            $request["category"]
                        ) ?>
                    </small>

                    <h2>
                        <?= htmlspecialchars(
                            $request["title"]
                        ) ?>
                    </h2>

                    <p>
                        <?= htmlspecialchars(
                            $request["story"]
                        ) ?>
                    </p>

                    <strong>
                        ₹<?= number_format(
                            $request["target_amount"] ?? 0
                        ) ?>
                    </strong>

                </div>

                <div class="request-right">

                    <span
                        class="status <?= strtolower(
                            str_replace(
                                " ",
                                "-",
                                $request["status"]
                            )
                        ) ?>"
                    >
                        <?= htmlspecialchars(
                            $request["status"]
                        ) ?>
                    </span>

                    <button
                        onclick="openReview(
                            <?= htmlspecialchars(
                                json_encode($request)
                            ) ?>
                        )"
                    >
                        Review
                    </button>

                </div>

            </article>

        <?php } ?>

    </section>

</main>

<div
    class="modal"
    id="reviewModal"
>

    <div class="modal-box">

        <button
            class="close"
            onclick="closeReview()"
        >
            ×
        </button>

        <small>
            REVIEW REQUEST
        </small>

        <h2 id="reviewTitle"></h2>

        <p id="reviewStory"></p>

        <div class="review-info">

            <strong>
                Category
            </strong>

            <span id="reviewCategory"></span>

            <strong>
                Target
            </strong>

            <span id="reviewAmount"></span>

            <strong>
                Supporting document
            </strong>

            <span>
                <a id="reviewProofLink" target="_blank" rel="noopener noreferrer" style="display: none;">
                    Open private proof (link expires in 15 minutes)
                </a>
                <span id="reviewProofUnavailable" style="display: none;">
                    No proof document is attached or an admin Storage link is unavailable.
                </span>
            </span>

        </div>

        <form method="post">

            <input
                type="hidden"
                name="id"
                id="requestId"
            >

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

function openReview(request) {

    document.getElementById(
        "requestId"
    ).value = request.id;

    document.getElementById(
        "reviewTitle"
    ).textContent = request.title;

    document.getElementById(
        "reviewStory"
    ).textContent = request.story;

    document.getElementById(
        "reviewCategory"
    ).textContent = request.category;

    document.getElementById(
        "reviewAmount"
    ).textContent =
        "₹" +
        Number(
            request.target_amount || 0
        ).toLocaleString("en-IN");

    const proofLink = document.getElementById("reviewProofLink");
    const proofUnavailable = document.getElementById("reviewProofUnavailable");
    proofLink.style.display = request.proof_signed_url ? "inline" : "none";
    proofUnavailable.style.display = request.proof_signed_url ? "none" : "inline";
    if (request.proof_signed_url) {
        proofLink.href = request.proof_signed_url;
    } else {
        proofLink.removeAttribute("href");
    }

    document.getElementById(
        "reviewModal"
    ).classList.add("show");
}

function closeReview() {

    document.getElementById(
        "reviewModal"
    ).classList.remove("show");
}

</script>

</body>

</html>