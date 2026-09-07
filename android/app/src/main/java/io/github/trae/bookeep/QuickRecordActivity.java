package io.github.trae.bookeep;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

public class QuickRecordActivity extends Activity {

    public static final String EXTRA_QUICK_INPUT = "quick_input_text";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 键盘弹出时平移视图，防止遮挡
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN);

        setContentView(R.layout.activity_quick_record);

        EditText input = findViewById(R.id.quick_input);
        Button btnCancel = findViewById(R.id.btn_cancel);
        Button btnSubmit = findViewById(R.id.btn_submit);

        // 自动聚焦并弹出键盘
        input.requestFocus();
        InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
        if (imm != null) {
            input.postDelayed(() -> {
                imm.showSoftInput(input, InputMethodManager.SHOW_FORCED);
            }, 100);
        }

        // 键盘回车键提交
        input.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == android.view.inputmethod.EditorInfo.IME_ACTION_DONE) {
                submitInput(input.getText().toString().trim());
                return true;
            }
            return false;
        });

        btnCancel.setOnClickListener(v -> {
            // 关闭键盘再退出
            imm.hideSoftInputFromWindow(input.getWindowToken(), 0);
            finish();
        });

        btnSubmit.setOnClickListener(v -> {
            submitInput(input.getText().toString().trim());
        });
    }

    private void submitInput(String text) {
        if (text.isEmpty()) {
            Toast.makeText(this, "请输入记账内容", Toast.LENGTH_SHORT).show();
            return;
        }

        // 将输入文本传递给 MainActivity
        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra(EXTRA_QUICK_INPUT, text);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(intent);
        finish();
    }

    @Override
    public void onBackPressed() {
        finish();
    }
}
