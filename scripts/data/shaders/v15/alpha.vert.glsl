#version 150

in vec4 al_color;
in vec4 al_pos;

uniform mat4 al_projview_matrix;

out vec4 v_color;

void main()
{
    gl_Position = al_projview_matrix * al_pos;
    v_color = al_color;
}
