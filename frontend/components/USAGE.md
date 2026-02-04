<!-- How to Use Header and Footer Components -->

# Using Reusable Header and Footer

## Option 1: Using jQuery (Simplest for Static Sites)

Add this script at the end of your HTML before closing `</body>` tag:

```html
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script>
    $(function() {
        $("#header").load("components/header.html");
        $("#footer").load("components/footer.html");
    });
</script>
```

Then in your HTML page, add placeholders:

```html
<body>
    <div id="header"></div>
    
    <!-- Your page content here -->
    
    <div id="footer"></div>
</body>
```

---

## Option 2: Using Fetch API (Modern JavaScript)

Add this script before closing `</body>` tag:

```html
<script>
    // Load Header
    fetch('components/header.html')
        .then(response => response.text())
        .then(data => document.getElementById('header').innerHTML = data);
    
    // Load Footer
    fetch('components/footer.html')
        .then(response => response.text())
        .then(data => document.getElementById('footer').innerHTML = data);
</script>
```

Then in your HTML:

```html
<body>
    <div id="header"></div>
    
    <!-- Your page content here -->
    
    <div id="footer"></div>
</body>
```

---

## Option 3: Server-Side Include (If using PHP/Node)

**For PHP:**
```html
<?php include('components/header.html'); ?>

<!-- Your content -->

<?php include('components/footer.html'); ?>
```

---

## Files Created:

- `components/header.html` - Navigation bar with logo
- `components/footer.html` - Footer with copyright
- `USAGE.md` - This file

**Recommendation:** Use Option 2 (Fetch API) for modern browsers, or Option 1 (jQuery) if jQuery is already loaded.
