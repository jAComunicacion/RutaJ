document.addEventListener('DOMContentLoaded', function() {
    var modal = document.querySelector('.ingreso-modal');
    var openButtons = document.querySelectorAll('.open-login-modal, #loginBtn');
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
            // Aquí puedes agregar la lógica para manejar el inicio de sesión
            console.log('Formulario enviado');
            closeModal();
        });
    }
});
