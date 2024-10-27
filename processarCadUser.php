<?php
session_start();

// Conectar ao Firebase
require 'vendor/autoload.php'; // Se você estiver usando o Composer

use Kreait\Firebase\Factory;

$factory = (new Factory)->withServiceAccount('chaveFire/machinon-14b72-firebase-adminsdk-eqz2i-d8aeb7707b.json'); // Caminho para suas credenciais do Firebase
$database = $factory->createDatabase();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $plano = $_POST['plano'];
    $codigo = $_POST['codigo'];

    // Se o código não for vazio
    if (!empty($codigo)) {
        // Referência a todas as empresas no Firebase
        $empresasRef = $database->getReference('empresas')->getValue();

        // Inicializa uma variável para verificar se o código existe
        $codigoExistente = false;

        // Percorre todas as empresas para verificar se o código existe
        foreach ($empresasRef as $empresaID => $empresa) {
            if (isset($empresa['codigoConvite']) && $empresa['codigoConvite'] === $codigo) {
                $codigoExistente = true;
                break; // Saia do loop se o código for encontrado
            }
        }

        if ($codigoExistente) { // Se o código existir
            // Salvar os dados na sessão
            $_SESSION['plano'] = $plano;
            $_SESSION['codigo'] = $codigo;

            // Redirecionar para a próxima página
            header('Location: cadastroEmpresa.php');
            exit();
        } else {
            // Se o código não existir, exibir mensagem de erro
            echo "<script>alert('Código de convite inválido. Tente novamente.');</script>";
        }
    } else {
        // Se não houver código, salvar os dados na sessão
        $_SESSION['plano'] = $plano;

        // Salvar outros dados do formulário na sessão
        $_SESSION['user_data'] = [
            'nome' => $_POST['name'] ?? '',
            'cargo' => $_POST['cargo'] ?? '',
            'email' => $_POST['email'] ?? '',
            'telefone' => $_POST['phone'] ?? '',
            'senha' => $_POST['password'] ?? '',
            'codigo' => $_POST['codigo'] ?? ''
        ];

        // Redirecionar para a próxima página
        header('Location: cadastroEmpresa.php');
        exit();
    }
}
?>
