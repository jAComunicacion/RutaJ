document.addEventListener('DOMContentLoaded', function() {
    var modal = document.querySelector('.ingreso-modal');
    var openButtons = document.querySelectorAll('.open-login-modal');
    var closeButton = modal ? modal.querySelector('.ingreso-close') : null;

    function openModal(e) {
        e.preventDefault();
        if (modal) {
            modal.classList.add('show');
        }
    }

    function closeModal() {
        if (modal) {
            modal.classList.remove('show');
        }
    }

    openButtons.forEach(function(button) {
        button.addEventListener('click', openModal);
    });

    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }

    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeModal();
            }
        });
    }

    var loginForm = document.querySelector('.ingreso-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const usuarioInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            if (!usuarioInput || !passwordInput) {
                console.error('No se encontraron los campos de usuario o contraseña');
                return;
            }
            const usuario = usuarioInput.value;
            const password = passwordInput.value;
            // Lógica para enviar los datos al servidor
            fetch('android/sign-in.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `email=${encodeURIComponent(usuario)}&password=${encodeURIComponent(password)}`
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Redirigir o mostrar un mensaje de éxito
                    console.log('Inicio de sesión exitoso');
                    closeModal();
                } else {
                    // Mostrar mensaje de error
                    console.error(data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
        });
    }
});
