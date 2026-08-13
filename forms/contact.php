<?php
 

  // carga el email que se quiera para recivir el contacto
  $receiving_email_address = 'gerencia@rutaj.com.ar';

  if( file_exists($php_email_form = '../assets/rutaj/php-email-form/php-email-form.php' )) {
    include( $php_email_form );
  } else {
    die( 'Ha ocurrido un error! Disculpas');
  }

  $contact = new PHP_Email_Form;
  $contact->ajax = true;
  
  $contact->to = $receiving_email_address;
  $contact->from_name = $_POST['name'];
  $contact->from_email = $_POST['email'];
  $contact->subject = $_POST['subject'];

  // Quitar barras de abajo si vas a usar SMTP para enviar los emails. setear las credenciales SMTP correctas
  /*
  $contact->smtp = array(
    'host' => 'example.com',
    'username' => 'example',
    'password' => 'pass',
    'port' => '587'
  );
  */

  $contact->add_message( $_POST['name'], 'From');
  $contact->add_message( $_POST['email'], 'Email');
  $contact->add_message( $_POST['message'], 'Message', 10);

  echo $contact->send();
?>
