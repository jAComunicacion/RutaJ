function emailSend(){

	var userName = document.getElementById('name').value;
	var phone = document.getElementById('phone').value;
    var email = document.getElementById('email').value;
    var email = document.getElementById('message').value;

	var messageBody = "Nombre y Apellido: " + userName +
	"<br/> Celular " + phone +
    "<br/> Email " + email;

	Email.send({
    Host : "smtp.elasticemail.com",
    Username : "gerencia@rutaj.com.ar",
        Password: "4BC59A6DDB4B7EA6E5B46A5076DBE56C88CA",
    To : 'julioarismendi@hotmail.com',
    From : "gerencia@rutaj.com.ar",
    Subject : "Baja de la App Ruta J",
    Body : messageBody
}).then(
  message => {
  	if(message=='OK'){
  		swal("Perfecto!", "Recibimos tu solicitud!", "success");
  	}
  	else{
  		swal("Error", "Intenta mas tarde por favor", "error");
  	}
  }
);
}