using UnityEngine;
using TMPro;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using UnityEngine.UI;

public class GameController : MonoBehaviour
{
    public TextMeshProUGUI roomCodeText;  // Mostrar código de la sala en la UI
    public TextMeshProUGUI playerNameText; // Mostrar nombre del jugador
    public InputField playerNameInput;    // Input para nombre del jugador
    private string roomCode;
    private string serverUrl = "https://myserver-fjs8.onrender.com/";  // URL de tu servidor

    void Start()
    {
        // Crear una nueva sala
        StartCoroutine(CreateRoom());
    }

    // Crear la sala en el servidor
    private async Task CreateRoom()
    {
        using (HttpClient client = new HttpClient())
        {
            HttpResponseMessage response = await client.PostAsync(serverUrl + "createRoom", null);
            string jsonResponse = await response.Content.ReadAsStringAsync();
            RoomResponse roomResponse = JsonUtility.FromJson<RoomResponse>(jsonResponse);
            roomCode = roomResponse.roomCode;

            // Mostrar el código de la sala
            roomCodeText.text = "Código de la sala: " + roomCode;

            // Enviar el código de la sala a la página web (esto lo podemos hacer con algún sistema si lo necesitas)
        }
    }

    // Unirse a la sala con el código
    public async void JoinRoom()
    {
        string playerName = playerNameInput.text;

        if (string.IsNullOrEmpty(playerName))
        {
            playerNameText.text = "¡Por favor ingresa tu nombre!";
            return;
        }

        // Enviar solicitud para unirse a la sala
        using (HttpClient client = new HttpClient())
        {
            var data = new { roomCode = roomCode, playerName = playerName };
            string json = JsonUtility.ToJson(data);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            HttpResponseMessage response = await client.PostAsync(serverUrl + "join", content);
            string jsonResponse = await response.Content.ReadAsStringAsync();
            JoinResponse joinResponse = JsonUtility.FromJson<JoinResponse>(jsonResponse);

            if (joinResponse.success)
            {
                playerNameText.text = "Bienvenido " + playerName;
                DisplayPlayers(joinResponse.players);  // Mostrar los jugadores en la sala
            }
            else
            {
                playerNameText.text = "Error: " + joinResponse.message;
            }
        }
    }

    // Mostrar los jugadores en la UI
    private void DisplayPlayers(string[] players)
    {
        // Aquí podemos agregar un nuevo texto en la pantalla para cada jugador
        foreach (var player in players)
        {
            GameObject playerObj = new GameObject(player);
            TextMeshProUGUI tmpText = playerObj.AddComponent<TextMeshProUGUI>();
            tmpText.text = player;
            tmpText.fontSize = 24;
            tmpText.color = Color.white;
            tmpText.transform.SetParent(transform);  // Añadirlo a la UI principal
        }
    }

    // Finalizar la partida y liberar la sala
    public async void EndGame()
    {
        using (HttpClient client = new HttpClient())
        {
            var data = new { roomCode = roomCode };
            string json = JsonUtility.ToJson(data);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            HttpResponseMessage response = await client.PostAsync(serverUrl + "endGame", content);
            string jsonResponse = await response.Content.ReadAsStringAsync();
            EndGameResponse endGameResponse = JsonUtility.FromJson<EndGameResponse>(jsonResponse);

            if (endGameResponse.success)
            {
                playerNameText.text = "La sala ha sido liberada";
            }
            else
            {
                playerNameText.text = "Error al liberar la sala";
            }
        }
    }

    [System.Serializable]
    public class RoomResponse
    {
        public string roomCode;
    }

    [System.Serializable]
    public class JoinResponse
    {
        public bool success;
        public string message;
        public string[] players;  // Lista de jugadores que se han unido a la sala
    }

    [System.Serializable]
    public class EndGameResponse
    {
        public bool success;
        public string message;
    }
}
